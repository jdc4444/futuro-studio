import projectData from './resume-projects.json';
import {applyProjectMediaOverrides} from './resume-media-overrides';

const projects=applyProjectMediaOverrides(projectData);

// One selection and order for the homepage and its full-screen pilot.
export const projectOrder = new Map([
  '/day-one',
  '/seletar-archive',
  '/lovb-adidas',
  '/bombas-dream-of-comfort',
  '/celeste-everyday',
  '/nike-aja-sabrina',
  '/polymarket-documentary',
  '/bombas-spring',
  '/siberia-hills',
  '/paracosm',
  '/alignment-documentary',
  '/spotify-hip-hop-classics-1',
  '/lovb-launch',
  '/ggm-accoustic',
].map((route, index) => [route, index]));

export const selectedProjects = projects
  .filter(project => projectOrder.has(project.route))
  .sort((a, b) => projectOrder.get(a.route)! - projectOrder.get(b.route)!);

export type SelectedProject = typeof selectedProjects[number];
