import { config } from 'dotenv'
import { existsSync } from 'node:fs'

export default function loadDotenv() {

    const envFiles = ['.env.local', '.env.production', '.env.development', '.env']

    for (const file of envFiles) {
        if (existsSync(file)) {
            config({ path: file })
            break // On s'arrête dès qu'on a chargé le plus prioritaire
        }
    }
}