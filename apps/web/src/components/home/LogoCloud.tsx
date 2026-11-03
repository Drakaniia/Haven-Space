const LOGOS = [
  { src: '/assets/images/public/logo-cloud/AgriTrack.png', alt: 'AgriTrack' },
  { src: '/assets/images/public/logo-cloud/Cremoso.png', alt: 'Cremoso' },
  { src: '/assets/images/public/logo-cloud/DentAssist.png', alt: 'DentAssist' },
  { src: '/assets/images/public/logo-cloud/EsperonDairyFarm.png', alt: 'Esperon Dairy Farm' },
  { src: '/assets/images/public/logo-cloud/FellowTrack.png', alt: 'FellowTrack' },
  { src: '/assets/images/public/logo-cloud/MediFind.png', alt: 'MediFind' },
  { src: '/assets/images/public/logo-cloud/QuickMart.png', alt: 'QuickMart' },
];

function Track() {
  return (
    <div className="flex items-center gap-[42px]">
      {LOGOS.map(logo => (
        <img key={logo.alt} src={logo.src} alt={logo.alt} loading="lazy" />
      ))}
    </div>
  );
}

export function LogoCloud() {
  return (
    <section className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-12">
      <h2 className="mb-5 text-center text-xl font-medium tracking-tight text-ink md:text-3xl">
        <span className="text-gray-ink">Trusted by experts.</span>
        <br />
        <span className="font-semibold">Used by the leaders.</span>
      </h2>
      <div
        className="h-px w-full max-w-5xl bg-subtle"
        style={{
          WebkitMaskImage: 'linear-gradient(to right, transparent, black, transparent)',
          maskImage: 'linear-gradient(to right, transparent, black, transparent)',
        }}
      />
      <div
        className="w-full overflow-hidden py-4"
        style={{
          WebkitMaskImage: 'linear-gradient(to right, transparent, black, transparent)',
          maskImage: 'linear-gradient(to right, transparent, black, transparent)',
        }}
      >
        <div className="logo-marquee-track">
          <Track />
          <Track />
        </div>
      </div>
      <div
        className="h-px w-full max-w-5xl bg-subtle"
        style={{
          WebkitMaskImage: 'linear-gradient(to right, transparent, black, transparent)',
          maskImage: 'linear-gradient(to right, transparent, black, transparent)',
        }}
      />
    </section>
  );
}
