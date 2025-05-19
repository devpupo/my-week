"use client"

import { useState, useEffect } from "react"
import { PlusCircle, Calendar, CheckCircle2, Trash2, X } from "lucide-react"
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
    completed: boolean
    days: string[]
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export default function TaskManager() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [newTask, setNewTask] = useState("")
    const [selectedDays, setSelectedDays] = useState<string[]>([])
    const [selectedTab, setSelectedTab] = useState("")
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isFrequencyDialogOpen, setIsFrequencyDialogOpen] = useState(false)
    const [pendingTask, setPendingTask] = useState("")

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
            setTasks(JSON.parse(savedTasks))
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
            completed: false,
            days: [...selectedDays],
        }

        setTasks([...tasks, task])
        setPendingTask("")
        setIsFrequencyDialogOpen(false)
    }

    const cancelAddTask = () => {
        setPendingTask("")
        setIsFrequencyDialogOpen(false)
    }

    const toggleTaskCompletion = (taskId: string) => {
        setTasks(tasks.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task)))
    }

    const deleteTask = (taskId: string) => {
        setTasks(tasks.filter((task) => task.id !== taskId))
    }

    const deleteAllTasksForWeek = () => {
        setTasks([])
        setIsDeleteDialogOpen(false)
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
                                {tasks
                                    .filter((task) => task.days.includes(day))
                                    .map((task) => (
                                        <div key={task.id} className="flex items-center justify-between p-3 border rounded-md">
                                            <div className="flex items-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => toggleTaskCompletion(task.id)}
                                                    className="mr-2"
                                                >
                                                    <CheckCircle2
                                                        className={`h-5 w-5 ${task.completed ? "text-green-500 fill-green-500" : "text-muted-foreground"}`}
                                                    />
                                                </Button>
                                                <div>
                                                    <span className={task.completed ? "line-through text-muted-foreground" : ""}>
                                                        {task.title}
                                                    </span>
                                                    {task.days.length > 1 && (
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            Recurring: {task.days.map((d) => d.substring(0, 3)).join(", ")}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => deleteTask(task.id)}>
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

            {/* Task Frequency Dialog */}
            <Dialog open={isFrequencyDialogOpen} onOpenChange={setIsFrequencyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Task Frequency</DialogTitle>
                        <DialogDescription>Select which days of the week this task should appear on.</DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <div className="flex flex-wrap gap-3 mb-4">
                            <Button size="sm" variant="outline" onClick={selectAllDays}>
                                Select All
                            </Button>
                            <Button size="sm" variant="outline" onClick={clearSelectedDays}>
                                Clear
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
