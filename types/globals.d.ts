// Ambient declarations the component needs when it is dropped into a project
// that does not already provide them (a Next app with the Tailwind/PostCSS
// pipeline supplies the CSS one; a bare TS project does not).

declare module '*.css'
declare module '*.svg' {
  const src: string
  export default src
}
declare module '*.webp' {
  const src: string
  export default src
}
declare module '*.jpg' {
  const src: string
  export default src
}
