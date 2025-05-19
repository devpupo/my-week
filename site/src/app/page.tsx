import TaskManager from "@/components/task-manager";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-24">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">My Week</h1>
        <TaskManager />
      </div>
    </main>
  )
}
