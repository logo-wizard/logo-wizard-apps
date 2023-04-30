export const getColorAndBackground = (md5: string) => {
    const matches = md5.match(/.{2}/g)!

    const [red, green, blue] = matches.map(hex => parseInt(hex, 16))

    // Formula from https://www.w3.org/TR/AERT/#color-contrast
    const luminance = (red * 0.299 + green * 0.587 + blue * 0.114) / 255

    const color = luminance > 0.6 ? '#222' : '#fff'

    return {
        background: `rgb(${[red, green, blue]})`,
        color,
    }
}


export const getInitials = (name: string) => {
    name = name.trim()

    if (name.length <= 3) return name

    return name
        .split(/\s+/)
        // @ts-ignore
        .map(w => [...w][0])
        .slice(0, 3)
        .join('')
}
