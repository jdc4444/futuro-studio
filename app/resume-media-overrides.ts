const spotifyPreviewBase =
  'https://jdc4444.github.io/jdc_resume/media/project-loops/spotify-hip-hop-classics-preview-20260909';

export function applyProjectMediaOverrides<
  T extends {route:string;media:{src:string;poster:string}}
>(projects:readonly T[]):T[] {
  return projects.map(project => project.route === '/spotify-hip-hop-classics-1'
    ? {
        ...project,
        media:{
          ...project.media,
          src:`${spotifyPreviewBase}.mp4?v=20260910-stream`,
          poster:`${spotifyPreviewBase}.jpg?v=20260910-stream`,
        },
      }
    : project
  );
}
