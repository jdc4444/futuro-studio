import { requireChatGPTUser } from "../chatgpt-auth";

// GitHub Pages is the public, static home. Its build cannot run the Studio
// authentication flow; the private front door remains dynamic on the Studio
// host, while the public export intentionally contains no Studio links.
const publicPagesExport = process.env.GITHUB_ACTIONS === "true";
export const dynamic = publicPagesExport ? "force-static" : "force-dynamic";

const studioApps = [
  ["Plan", "Season One", "Agents, slate, clients and the studio plan.", "https://season-one.josdiazcontreras.chatgpt.site/"],
  ["Create", "Infinite Light", "Film concepts, stills, films and the generation ledger.", "https://infinite-light-films.josdiazcontreras.chatgpt.site/"],
  ["Create", "Cut Studio", "Generation estimates and production planning.", "https://cut-studio-seedance-costs.josdiazcontreras.chatgpt.site/"],
  ["Design", "Cover Index", "Covers, spreads and visual research.", "https://cover-index.josdiazcontreras.chatgpt.site/"],
  ["Design", "Explorations", "Typography, books, invitations and motion studies.", "https://infinite-light-jdc.josdiazcontreras.chatgpt.site/"],
  ["Video", "Background clips", "The curated short clips approved for Futuro’s public surfaces.", "https://jdc4444.github.io/futuro-backgrounds/"],
];

export default async function StudioFront() {
  if (publicPagesExport) {
    return <main className="studio-front-denied"><p>Futuro Studio is private.</p></main>;
  }
  const user = await requireChatGPTUser("/front");
  if (user.email.toLowerCase() !== "josdiazcontreras@gmail.com") {
    return <main className="studio-front-denied"><p>Futuro Studio is private.</p></main>;
  }

  return (
    <main className="studio-front">
      <header className="studio-front-header">
        <a href="/" className="studio-front-mark" aria-label="Return to Futuro">FUTURO</a>
        <span>STUDIO / PRIVATE</span>
      </header>
      <section className="studio-front-intro">
        <p className="studio-front-kicker">FRONT DOOR</p>
        <h1>Everything that travels.</h1>
        <p>Portable studio tools, working references and the video excerpts cleared for the web. Original camera media and local-drive operations stay off the public internet.</p>
      </section>
      <section className="studio-front-grid" aria-label="Studio tools">
        {studioApps.map(([section, title, description, href]) => (
          <a className="studio-front-card" href={href} key={title}>
            <span>{section}</span>
            <h2>{title}</h2>
            <p>{description}</p>
            <b>Open <i aria-hidden="true">↗</i></b>
          </a>
        ))}
      </section>
      <footer className="studio-front-footer">Signed in as {user.email}</footer>
    </main>
  );
}
