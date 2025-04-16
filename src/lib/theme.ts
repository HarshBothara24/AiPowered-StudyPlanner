export type Theme = "light" | "dark" | "system"

export const themes = ["light", "dark", "system"] as const

export interface ThemeConfig {
  name: Theme
  label: string
}

export const themeConfig: ThemeConfig[] = [
  {
    name: "light",
    label: "Light",
  },
  {
    name: "dark",
    label: "Dark",
  },
  {
    name: "system",
    label: "System",
  },
]

export const defaultTheme: Theme = "system" 