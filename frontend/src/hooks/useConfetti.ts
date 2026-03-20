import confetti from 'canvas-confetti'

const useConfetti = (fire: boolean) => {

    const fireConfetti = () => {
        const end = Date.now() + 1000 // 1 seconds
        const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"]

        const frame = () => {
            if (Date.now() > end) return

            confetti({
                particleCount: 1,
                angle: 60,
                spread: 55,
                startVelocity: 60,
                origin: { x: 0, y: 0.5 },
                colors: colors,
            })
            confetti({
                particleCount: 1,
                angle: 120,
                spread: 55,
                startVelocity: 60,
                origin: { x: 1, y: 0.5 },
                colors: colors,
            })

            requestAnimationFrame(frame)
        }

        frame()
    }


    if (fire) {
        fireConfetti()
    }

}

export default useConfetti;