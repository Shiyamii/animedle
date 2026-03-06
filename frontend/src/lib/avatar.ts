export const DICEBEAR_STYLE = "thumbs";

export function getAvatarUrl(seed: string): string {
    return `https://api.dicebear.com/9.x/${DICEBEAR_STYLE}/svg?seed=${encodeURIComponent(seed)}`;
}

export function generateSeed(): string {
    return Math.random().toString(36).substring(2, 10);
}
