// AI Trash Talk lines per game mode
// Toxic but no swearing — all lines readable in ~1 second (short and punchy)

export const TRASH_TALK = {
    CUBE: [
        "Bro couldn't even jump.",
        "My grandma plays better.",
        "Delete the game.",
        "Even the spikes felt bad.",
        "Was that your actual best?",
        "Pathetic.",
        "Spikes are laughing at you.",
        "Skill issue.",
        "Try again, maybe slower.",
        "That was genuinely tragic."
    ],
    SHIP: [
        "Hold. Release. You failed both.",
        "A brick flies better.",
        "Physics beat you. PHYSICS.",
        "Aerial awareness: zero.",
        "The ship quit on you.",
        "Up is up. Down is down. Pick one.",
        "Flew straight into it. Wow.",
        "Flying lessons can't help you.",
        "The ceiling isn't a target.",
        "Just... hold the button."
    ],
    BALL: [
        "One button. You still failed.",
        "Pick a direction. Any direction.",
        "A hamster would beat you.",
        "Gravity isn't that hard.",
        "You died to ROLLING.",
        "Up or down. That's it. Failed.",
        "Even a pancake rolls better.",
        "Tragic. Just tragic.",
        "Flip. That's all. You couldn't.",
        "Atrocious."
    ],
    UFO: [
        "You flew into a spike. Classic.",
        "Tap. Don't mash. Clearly.",
        "Aliens are embarrassed.",
        "Outstanding stupidity.",
        "You failed at floating.",
        "The spike didn't move. You did.",
        "Your rhythm is broken.",
        "Worse than Flappy Bird. Somehow.",
        "The UFO is ashamed.",
        "Just tap less."
    ],
    WAVE: [
        "Hold straight. You can't.",
        "Zero rhythm. Absolute zero.",
        "Zig. Zag. Die. You.",
        "That line was a disaster.",
        "Wave wants a new player.",
        "Diagonal. One direction. Failed.",
        "Actual skill issue.",
        "You fought the controls. Lost.",
        "Poetically bad.",
        "The wave crashed. Your fault."
    ],
    SPIDER: [
        "Teleported into a spike. Genius.",
        "Situational awareness: donut.",
        "Spider-Man is embarrassed.",
        "You tried to lose. Succeeded.",
        "Land AWAY from the spike.",
        "The web is tangled. Like you.",
        "Spider mode quit watching.",
        "Ground, ceiling, spike. Trilogy.",
        "Zero self-awareness.",
        "Impressive self-destruction."
    ],
    ROBOT: [
        "One button. You failed it.",
        "Beep boop you're dead.",
        "Error 404: skill not found.",
        "Hold = big jump. You forgot.",
        "The robot cried.",
        "A toaster has better timing.",
        "Mechanical failure. That's you.",
        "Tap or hold. Pick one.",
        "Rebooting... still terrible.",
        "Broken machine energy."
    ]
};

export function getRandomTrashTalk(gameMode) {
    const lines = TRASH_TALK[gameMode] || TRASH_TALK['CUBE'];
    return lines[Math.floor(Math.random() * lines.length)];
}
