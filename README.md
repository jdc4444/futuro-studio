# Futuro

Source for [futuro.studio](https://futuro.studio), deployed as a static GitHub Pages site.

## Development

```bash
npm ci
npm run dev
```

`npm run build` pre-renders the site into `dist/client`. Pushes to `main` deploy through GitHub Actions.

`npm run check:scroll` plays simulated trackpad and mouse-wheel streams through the scroll gesture gate
(`app/pilot/pilot-navigation.ts`): one swipe must move one project, a follow-up swipe a second one. Run it after
touching the gate or the wheel handler in `app/pilot/pilot-projects.tsx`.
