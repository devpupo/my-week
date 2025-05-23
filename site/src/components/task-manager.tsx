"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { PlusCircle, Calendar, CheckCircle2, Trash2, X, Clock, AlignLeft, Pencil, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { ThemeToggle } from "@/components/theme-toggle"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

type Task = {
    id: string
    title: string
    description?: string // Optional description field
    completedDays: string[] // Track which days the task is completed
    days: string[]
    time: string // Store time in 24h format (HH:MM)
}

// Type for legacy task format that might be in localStorage
type LegacyTask = {
    id: string
    title: string
    description?: string
    completed?: boolean
    completedDays?: string[]
    days: string[]
    time?: string
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

// Format time for display (convert from 24h to 12h format if needed)
const formatTimeForDisplay = (time: string) => {
    if (!time) return ""

    try {
        const [hours, minutes] = time.split(":").map(Number)
        const period = hours >= 12 ? "PM" : "AM"
        const displayHours = hours % 12 || 12
        return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`
    } catch {
        return time
    }
}

// Truncate text to a certain length
const truncateText = (text: string, maxLength: number) => {
    if (!text || text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
}

export default function TaskManager() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [newTask, setNewTask] = useState("")
    const [taskDescription, setTaskDescription] = useState("")
    const [selectedDays, setSelectedDays] = useState<string[]>([])
    const [timeInput, setTimeInput] = useState("09:00") // Default to 9:00
    const [selectedTab, setSelectedTab] = useState("")
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isFrequencyDialogOpen, setIsFrequencyDialogOpen] = useState(false)
    const [pendingTask, setPendingTask] = useState("")
    const [taskToDelete, setTaskToDelete] = useState<{ id: string; day: string } | null>(null)
    const [isDeleteTaskDialogOpen, setIsDeleteTaskDialogOpen] = useState(false)
    const [selectedTaskDetails, setSelectedTaskDetails] = useState<Task | null>(null)
    const [isTaskDetailsDialogOpen, setIsTaskDetailsDialogOpen] = useState(false)
    const [isEditingTask, setIsEditingTask] = useState(false)
    const [editedTitle, setEditedTitle] = useState("")
    const [editedDescription, setEditedDescription] = useState("")
    const [editedTime, setEditedTime] = useState("09:00")
    const [updateScope, setUpdateScope] = useState<"current" | "all">("all")
    const [currentViewDay, setCurrentViewDay] = useState<string>("")

    // Get current day of week and set as default tab
    useEffect(() => {
        const today = new Date()
        const dayIndex = today.getDay() // 0 is Sunday, 1 is Monday, etc.
        // Convert to our array index (our array starts with Monday at index 0)
        const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1
        const currentDay = DAYS_OF_WEEK[adjustedIndex]
        setSelectedTab(currentDay)
        setCurrentViewDay(currentDay)
        setSelectedDays([currentDay]) // Also set as default selected day for new tasks
    }, [])

    // Update current view day when tab changes
    useEffect(() => {
        setCurrentViewDay(selectedTab)
    }, [selectedTab])

    // Load tasks from localStorage on component mount
    useEffect(() => {
        const savedTasks = localStorage.getItem("weeklyTasks")
        if (savedTasks) {
            try {
                // Parse the saved tasks
                const parsedTasks = JSON.parse(savedTasks) as unknown

                // Ensure parsedTasks is an array
                if (!Array.isArray(parsedTasks)) {
                    console.error("Saved tasks is not an array")
                    return
                }

                // Convert old task format to new format
                const updatedTasks: Task[] = []

                for (const rawTask of parsedTasks) {
                    // Skip if not an object
                    if (!rawTask || typeof rawTask !== "object") {
                        continue
                    }

                    // Cast to LegacyTask to access properties
                    const task = rawTask as LegacyTask

                    // Validate the task has the minimum required properties
                    if (!task.id || !task.title || !Array.isArray(task.days)) {
                        console.warn("Skipping invalid task:", task)
                        continue
                    }

                    // Create a new task with the correct structure
                    updatedTasks.push({
                        id: task.id,
                        title: task.title,
                        description: typeof task.description === "string" ? task.description : undefined,
                        completedDays: Array.isArray(task.completedDays)
                            ? [...task.completedDays]
                            : task.completed
                                ? [...task.days]
                                : [],
                        days: [...task.days],
                        time: typeof task.time === "string" ? task.time : "09:00", // Default time for existing tasks
                    })
                }

                setTasks(updatedTasks)
            } catch (error) {
                console.error("Error parsing saved tasks:", error)
                // If there's an error parsing, start with empty tasks
                setTasks([])
            }
        }
    }, [])

    // Save tasks to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem("weeklyTasks", JSON.stringify(tasks))
    }, [tasks])

    const toggleDaySelection = (day: string) => {
        setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
    }

    const selectAllDays = () => {
        setSelectedDays([...DAYS_OF_WEEK])
    }

    const clearSelectedDays = () => {
        setSelectedDays([])
    }

    const initiateAddTask = () => {
        if (newTask.trim() === "") return

        setPendingTask(newTask)
        setNewTask("")
        setIsFrequencyDialogOpen(true)
    }

    const finalizeAddTask = () => {
        if (pendingTask.trim() === "" || selectedDays.length === 0) return

        const task: Task = {
            id: Date.now().toString(),
            title: pendingTask,
            description: taskDescription.trim() || undefined,
            completedDays: [],
            days: [...selectedDays],
            time: timeInput,
        }

        setTasks([...tasks, task])
        setPendingTask("")
        setTaskDescription("")
        setTimeInput("09:00") // Reset to default time
        setIsFrequencyDialogOpen(false)
    }

    const cancelAddTask = () => {
        setPendingTask("")
        setTaskDescription("")
        setTimeInput("09:00") // Reset to default time
        setIsFrequencyDialogOpen(false)
    }

    // Toggle task completion for a specific day
    const toggleTaskCompletion = (taskId: string, day: string) => {
        setTasks(
            tasks.map((task) => {
                if (task.id === taskId) {
                    const newCompletedDays = task.completedDays.includes(day)
                        ? task.completedDays.filter((d) => d !== day)
                        : [...task.completedDays, day]

                    return { ...task, completedDays: newCompletedDays }
                }
                return task
            }),
        )
    }

    // Show task details dialog
    const showTaskDetails = (task: Task) => {
        setSelectedTaskDetails(task)
        setEditedTitle(task.title)
        setEditedDescription(task.description || "")
        setEditedTime(task.time)
        setUpdateScope("all") // Default to updating all occurrences
        setIsEditingTask(false)
        setIsTaskDetailsDialogOpen(true)
    }

    // Start editing task
    const startEditingTask = () => {
        if (!selectedTaskDetails) return
        setIsEditingTask(true)
    }

    // Save edited task
    const saveEditedTask = () => {
        if (!selectedTaskDetails || !editedTitle.trim()) return

        if (updateScope === "all") {
            // Update task for all days
            setTasks(
                tasks.map((task) => {
                    if (task.id === selectedTaskDetails.id) {
                        return {
                            ...task,
                            title: editedTitle.trim(),
                            description: editedDescription.trim() || undefined,
                            time: editedTime,
                        }
                    }
                    return task
                }),
            )

            // Update the selected task details
            setSelectedTaskDetails({
                ...selectedTaskDetails,
                title: editedTitle.trim(),
                description: editedDescription.trim() || undefined,
                time: editedTime,
            })
        } else {
            // Update task only for the current day
            // First, find the original task
            const originalTask = tasks.find((task) => task.id === selectedTaskDetails.id)

            if (!originalTask) return

            // If the task only appears on this day, just update it
            if (originalTask.days.length === 1) {
                setTasks(
                    tasks.map((task) => {
                        if (task.id === selectedTaskDetails.id) {
                            return {
                                ...task,
                                title: editedTitle.trim(),
                                description: editedDescription.trim() || undefined,
                                time: editedTime,
                            }
                        }
                        return task
                    }),
                )
            } else {
                // Create a new task for this specific day
                const newTask: Task = {
                    id: Date.now().toString(),
                    title: editedTitle.trim(),
                    description: editedDescription.trim() || undefined,
                    completedDays: originalTask.completedDays.includes(currentViewDay) ? [currentViewDay] : [],
                    days: [currentViewDay],
                    time: editedTime,
                }

                // Remove the current day from the original task
                const updatedTasks = tasks.map((task) => {
                    if (task.id === selectedTaskDetails.id) {
                        return {
                            ...task,
                            days: task.days.filter((day) => day !== currentViewDay),
                            completedDays: task.completedDays.filter((day) => day !== currentViewDay),
                        }
                    }
                    return task
                })

                // Add the new task
                setTasks([...updatedTasks, newTask])

                // Update the selected task details to the new task
                setSelectedTaskDetails(newTask)
            }
        }

        setIsEditingTask(false)
    }

    // Cancel editing task
    const cancelEditingTask = () => {
        if (!selectedTaskDetails) return
        setEditedTitle(selectedTaskDetails.title)
        setEditedDescription(selectedTaskDetails.description || "")
        setEditedTime(selectedTaskDetails.time)
        setUpdateScope("all") // Reset to default
        setIsEditingTask(false)
    }

    // Initiate delete task for a specific day
    const initiateDeleteTask = (taskId: string, day: string, event: React.MouseEvent) => {
        // Stop event propagation to prevent opening the task details dialog
        event.stopPropagation()

        setTaskToDelete({ id: taskId, day })
        setIsDeleteTaskDialogOpen(true)
    }

    // Delete task for a specific day
    const confirmDeleteTask = () => {
        if (!taskToDelete) return

        const { id, day } = taskToDelete

        // Create a new array of tasks with the specified task removed or modified
        const updatedTasks: Task[] = []

        for (const task of tasks) {
            if (task.id === id) {
                // If task only appears on this day, skip it (remove it)
                if (task.days.length === 1) {
                    continue
                }

                // Otherwise, remove this day from the task's days
                updatedTasks.push({
                    ...task,
                    days: task.days.filter((d) => d !== day),
                    completedDays: task.completedDays.filter((d) => d !== day),
                })
            } else {
                // Keep other tasks unchanged
                updatedTasks.push(task)
            }
        }

        setTasks(updatedTasks)
        setIsDeleteTaskDialogOpen(false)
        setTaskToDelete(null)
    }

    const deleteAllTasksForWeek = () => {
        setTasks([])
        setIsDeleteDialogOpen(false)
    }

    // Check if a task is completed for a specific day
    const isTaskCompletedForDay = (task: Task, day: string) => {
        return task.completedDays.includes(day)
    }

    // Sort tasks by time
    const getSortedTasksForDay = (day: string) => {
        return tasks
            .filter((task) => task.days.includes(day))
            .sort((a, b) => {
                // Sort by time (earlier times first)
                return a.time.localeCompare(b.time)
            })
    }

    // Handle task details dialog close
    const handleTaskDetailsDialogClose = (open: boolean) => {
        if (!open) {
            setIsEditingTask(false)
        }
        setIsTaskDetailsDialogOpen(open)
    }

    return (
        <Card className="w-full max-w-full overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Weekly Task Manager
                </CardTitle>
                <div className="flex items-center space-x-2">
                    <ThemeToggle />
                    <Button variant="outline" size="icon" onClick={() => setIsDeleteDialogOpen(true)} className="h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {/* Task Input Section - Now above the tabs */}
                <div className="mb-6 space-y-4">
                    <div className="flex space-x-2">
                        <Input
                            placeholder="Add a new task..."
                            value={newTask}
                            onChange={(e) => setNewTask(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && initiateAddTask()}
                        />
                        <Button onClick={initiateAddTask} disabled={newTask.trim() === ""}>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Add
                        </Button>
                    </div>
                </div>

                {/* Tabs for days of the week */}
                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                    <TabsList className="flex w-full mb-4">
                        {DAYS_OF_WEEK.map((day) => (
                            <TabsTrigger key={day} value={day} className="flex-1 min-w-0">
                                <span className="hidden sm:inline">{day.substring(0, 3)}</span>
                                <span className="sm:hidden">{day.substring(0, 1)}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {DAYS_OF_WEEK.map((day) => (
                        <TabsContent key={day} value={day} className="space-y-4">
                            <div className="space-y-2">
                                {getSortedTasksForDay(day).map((task) => (
                                    <div
                                        key={task.id}
                                        className="flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
                                        onClick={() => showTaskDetails(task)}
                                    >
                                        <div className="flex items-center max-w-[calc(100%-80px)]">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation() // Prevent opening task details
                                                    toggleTaskCompletion(task.id, day)
                                                }}
                                                className="mr-2 flex-shrink-0"
                                            >
                                                <CheckCircle2
                                                    className={`h-5 w-5 ${isTaskCompletedForDay(task, day) ? "text-green-500 fill-green-500" : "text-muted-foreground"}`}
                                                />
                                            </Button>
                                            <div className="min-w-0">
                                                <div className="flex items-center">
                                                    <Clock className="h-4 w-4 mr-1 text-muted-foreground flex-shrink-0" />
                                                    <span className="text-sm font-medium text-muted-foreground mr-2 flex-shrink-0">
                                                        {formatTimeForDisplay(task.time)}
                                                    </span>
                                                    <span
                                                        className={`truncate ${isTaskCompletedForDay(task, day) ? "line-through text-muted-foreground" : ""}`}
                                                    >
                                                        {truncateText(task.title, 30)}
                                                    </span>
                                                </div>
                                                {task.days.length > 1 && (
                                                    <div className="text-xs text-muted-foreground mt-1 truncate">
                                                        Recurring: {task.days.map((d) => d.substring(0, 3)).join(", ")}
                                                    </div>
                                                )}
                                                {task.description && (
                                                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                                                        <AlignLeft className="h-3 w-3 mr-1" />
                                                        <span>Has description</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => initiateDeleteTask(task.id, day, e)}
                                            className="flex-shrink-0"
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                ))}
                                {tasks.filter((task) => task.days.includes(day)).length === 0 && (
                                    <p className="text-center text-muted-foreground py-4">
                                        No tasks for {day}. Add some tasks to get started!
                                    </p>
                                )}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>

            {/* Delete All Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will permanently delete all your tasks for the entire week. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteAllTasksForWeek} className="bg-red-600 hover:bg-red-700">
                            Delete All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Task for Specific Day Dialog */}
            <AlertDialog open={isDeleteTaskDialogOpen} onOpenChange={setIsDeleteTaskDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove task for this day?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the task only for {taskToDelete?.day}. The task will remain on other days if it&apos;s
                            recurring.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setTaskToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteTask} className="bg-red-600 hover:bg-red-700">
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Task Details Dialog */}
            <Dialog open={isTaskDetailsDialogOpen} onOpenChange={handleTaskDetailsDialogClose}>
                <DialogContent>
                    <DialogHeader>
                        {isEditingTask ? (
                            <Input
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                className="text-lg font-semibold"
                                placeholder="Task title"
                            />
                        ) : (
                            <DialogTitle>{selectedTaskDetails?.title}</DialogTitle>
                        )}
                        {isEditingTask ? (
                            <div className="mt-2">
                                <label htmlFor="task-time-edit" className="text-sm font-medium">
                                    Time
                                </label>
                                <Input
                                    id="task-time-edit"
                                    type="time"
                                    value={editedTime}
                                    onChange={(e) => setEditedTime(e.target.value)}
                                    className="w-full mt-1"
                                />
                            </div>
                        ) : (
                            <DialogDescription>
                                {formatTimeForDisplay(selectedTaskDetails?.time || "")} •
                                {selectedTaskDetails?.days.map((d) => ` ${d.substring(0, 3)}`).join(",")}
                            </DialogDescription>
                        )}
                    </DialogHeader>

                    <div className="py-4">
                        {isEditingTask ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="task-description-edit" className="text-sm font-medium">
                                        Description (optional)
                                    </label>
                                    <Textarea
                                        id="task-description-edit"
                                        placeholder="Add details about this task..."
                                        value={editedDescription}
                                        onChange={(e) => setEditedDescription(e.target.value)}
                                        className="w-full resize-none"
                                        rows={5}
                                    />
                                </div>

                                {selectedTaskDetails && selectedTaskDetails.days.length > 1 && (
                                    <div className="space-y-2 pt-2 border-t">
                                        <label className="text-sm font-medium">Update scope</label>
                                        <RadioGroup
                                            value={updateScope}
                                            onValueChange={(value) => setUpdateScope(value as "current" | "all")}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="current" id="update-current" />
                                                <Label htmlFor="update-current">Update only for {currentViewDay}</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="all" id="update-all" />
                                                <Label htmlFor="update-all">Update for all days ({selectedTaskDetails.days.length} days)</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                )}
                            </div>
                        ) : selectedTaskDetails?.description ? (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">Description</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedTaskDetails.description}</p>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No description provided.</p>
                        )}
                    </div>

                    <DialogFooter className="flex justify-between sm:justify-end">
                        {isEditingTask ? (
                            <>
                                <Button variant="outline" onClick={cancelEditingTask} className="mr-2">
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                                <Button onClick={saveEditedTask} disabled={!editedTitle.trim()}>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" onClick={() => setIsTaskDetailsDialogOpen(false)} className="mr-2">
                                    Close
                                </Button>
                                <Button onClick={startEditingTask}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Task Frequency Dialog */}
            <Dialog open={isFrequencyDialogOpen} onOpenChange={setIsFrequencyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Task Details</DialogTitle>
                        <DialogDescription>Enter time, description, and select days for this task.</DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {/* Time input */}
                        <div className="space-y-2">
                            <label htmlFor="task-time" className="text-sm font-medium">
                                Time
                            </label>
                            <Input
                                id="task-time"
                                type="time"
                                value={timeInput}
                                onChange={(e) => setTimeInput(e.target.value)}
                                className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">Enter time in 24-hour format (HH:MM)</p>
                        </div>

                        {/* Description input */}
                        <div className="space-y-2">
                            <label htmlFor="task-description" className="text-sm font-medium">
                                Description (optional)
                            </label>
                            <Textarea
                                id="task-description"
                                placeholder="Add details about this task..."
                                value={taskDescription}
                                onChange={(e) => setTaskDescription(e.target.value)}
                                className="w-full resize-none"
                                rows={3}
                            />
                        </div>

                        {/* Day selection */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Days</label>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={selectAllDays}>
                                        Select All
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={clearSelectedDays}>
                                        Clear
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                {DAYS_OF_WEEK.map((day) => (
                                    <div key={day} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`freq-day-${day}`}
                                            checked={selectedDays.includes(day)}
                                            onCheckedChange={() => toggleDaySelection(day)}
                                        />
                                        <label htmlFor={`freq-day-${day}`} className="text-sm cursor-pointer">
                                            {day}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={cancelAddTask} className="mr-2">
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                        </Button>
                        <Button onClick={finalizeAddTask} disabled={selectedDays.length === 0}>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Add Task
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
