"use client"

import { useState, useEffect } from "react"
import { PlusCircle, Calendar, CheckCircle2, Trash2, X, Clock } from "lucide-react"
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

type Task = {
    id: string
    title: string
    completedDays: string[] // Track which days the task is completed
    days: string[]
    time: string // Store time in 24h format (HH:MM)
}

// Type for legacy task format that might be in localStorage
type LegacyTask = {
    id: string
    title: string
    completed?: boolean
    completedDays?: string[]
    days: string[]
    time?: string
    // Remove the [key: string]: any index signature
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
        // Remove the unused 'e' parameter
        return time
    }
}

export default function TaskManager() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [newTask, setNewTask] = useState("")
    const [selectedDays, setSelectedDays] = useState<string[]>([])
    const [timeInput, setTimeInput] = useState("09:00") // Default to 9:00
    const [selectedTab, setSelectedTab] = useState("")
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isFrequencyDialogOpen, setIsFrequencyDialogOpen] = useState(false)
    const [pendingTask, setPendingTask] = useState("")
    const [taskToDelete, setTaskToDelete] = useState<{ id: string; day: string } | null>(null)
    const [isDeleteTaskDialogOpen, setIsDeleteTaskDialogOpen] = useState(false)

    // Get current day of week and set as default tab
    useEffect(() => {
        const today = new Date()
        const dayIndex = today.getDay() // 0 is Sunday, 1 is Monday, etc.
        // Convert to our array index (our array starts with Monday at index 0)
        const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1
        const currentDay = DAYS_OF_WEEK[adjustedIndex]
        setSelectedTab(currentDay)
        setSelectedDays([currentDay]) // Also set as default selected day for new tasks
    }, [])

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
                const updatedTasks: Task[] = parsedTasks
                    .map((rawTask) => {
                        // Validate the task has the minimum required properties
                        const task = rawTask as LegacyTask
                        if (!task.id || !task.title || !Array.isArray(task.days)) {
                            // Skip invalid tasks
                            console.warn("Skipping invalid task:", task)
                            return null
                        }

                        // Create a new task with the correct structure
                        return {
                            id: task.id,
                            title: task.title,
                            completedDays: Array.isArray(task.completedDays)
                                ? [...task.completedDays]
                                : task.completed
                                    ? [...task.days]
                                    : [],
                            days: [...task.days],
                            time: typeof task.time === "string" ? task.time : "09:00", // Default time for existing tasks
                        }
                    })
                    .filter((task): task is Task => task !== null)

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
            completedDays: [],
            days: [...selectedDays],
            time: timeInput,
        }

        setTasks([...tasks, task])
        setPendingTask("")
        setTimeInput("09:00") // Reset to default time
        setIsFrequencyDialogOpen(false)
    }

    const cancelAddTask = () => {
        setPendingTask("")
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

    // Initiate delete task for a specific day
    const initiateDeleteTask = (taskId: string, day: string) => {
        setTaskToDelete({ id: taskId, day })
        setIsDeleteTaskDialogOpen(true)
    }

    // Delete task for a specific day
    const confirmDeleteTask = () => {
        if (!taskToDelete) return

        const { id, day } = taskToDelete

        setTasks(
            tasks
                .map((task) => {
                    if (task.id === id) {
                        // If task only appears on this day, remove it completely
                        if (task.days.length === 1) {
                            return null
                        }

                        // Otherwise, remove this day from the task's days
                        return {
                            ...task,
                            days: task.days.filter((d) => d !== day),
                            completedDays: task.completedDays.filter((d) => d !== day),
                        }
                    }
                    return task
                })
                .filter(Boolean) as Task[],
        )

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
                                    <div key={task.id} className="flex items-center justify-between p-3 border rounded-md">
                                        <div className="flex items-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => toggleTaskCompletion(task.id, day)}
                                                className="mr-2"
                                            >
                                                <CheckCircle2
                                                    className={`h-5 w-5 ${isTaskCompletedForDay(task, day) ? "text-green-500 fill-green-500" : "text-muted-foreground"}`}
                                                />
                                            </Button>
                                            <div>
                                                <div className="flex items-center">
                                                    <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                                                    <span className="text-sm font-medium text-muted-foreground mr-2">
                                                        {formatTimeForDisplay(task.time)}
                                                    </span>
                                                    <span
                                                        className={isTaskCompletedForDay(task, day) ? "line-through text-muted-foreground" : ""}
                                                    >
                                                        {task.title}
                                                    </span>
                                                </div>
                                                {task.days.length > 1 && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        Recurring: {task.days.map((d) => d.substring(0, 3)).join(", ")}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => initiateDeleteTask(task.id, day)}>
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

            {/* Task Frequency Dialog */}
            <Dialog open={isFrequencyDialogOpen} onOpenChange={setIsFrequencyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Task Details</DialogTitle>
                        <DialogDescription>Enter time and select days for this task.</DialogDescription>
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
