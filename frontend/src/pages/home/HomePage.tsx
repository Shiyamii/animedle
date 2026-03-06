import { Button } from "@/components/ui/button"

function HomePage() {
    return (
        <div className="flex min-h-svh w-full flex-col items-center justify-center">
            <Button variant={'default'}>Click me</Button>
            <div className={'bg-secondary'}>
                <h1 className="text-2xl font-bold text-primary">Hello, world!</h1>
            </div>
        </div>
    )
}

export default HomePage;