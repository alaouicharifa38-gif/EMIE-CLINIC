import { useState } from 'react';
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  Instagram,
  MapPin,
  Menu,
  Phone,
  X,
} from 'lucide-react';
import type { ClinicPublicSettings, ClinicService } from '../../shared/types.ts';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import { BookingModal } from './BookingModal.tsx';
import { EmieLogo } from './EmieLogo.tsx';
import { LanguageSwitcher } from './LanguageSwitcher.tsx';
import { SelfServiceModal } from './SelfServiceModal.tsx';

interface PublicWebsiteProps {
  settings: ClinicPublicSettings;
  services: ClinicService[];
  onNavigateAdmin: () => void;
}

const SERVICE_IMAGES_BY_SLUG: Record<string, string> = {
  kinesitherapie: '/src/assets/images/service_kine_1795021968260.jpg',
  osteopathie: '/src/assets/images/service_osteo_1795021969668.jpg',
  amincissement: '/src/assets/images/service_amincissement_1795021969772.jpg',
  cupping: '/src/assets/images/service_cupping_1795021969470.jpg',
  'soins-du-visage': '/src/assets/images/service_visage_1795021970454.jpg',
};

function ClinicImage({
  src,
  alt,
  className = '',
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-[#F6F2E9] via-[#EDEADE] to-[#AFC9A3]/35 text-[#444343] p-6 text-center ${className}`}
      >
        <span className="font-display font-light text-sm tracking-widest uppercase">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export function PublicWebsite({
  settings,
  services,
  onNavigateAdmin,
}: PublicWebsiteProps) {
  const { language, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selfServiceOpen, setSelfServiceOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(
    undefined,
  );

  const activeServices = services
    .filter((s) => s.active)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const openBooking = (serviceId?: string) => {
    setSelectedServiceId(serviceId);
    setBookingOpen(true);
    setMobileMenuOpen(false);
  };

  // Preserve exact official French headline/subheadline when in French, or use localized version
  const heroHeadline =
    language === 'fr' ? settings.headline || t.hero.headline : t.hero.headline;
  const heroSubheadline =
    language === 'fr'
      ? settings.subheadline || t.hero.subheadline
      : t.hero.subheadline;

  return (
    <div id="top" className="min-h-screen flex flex-col bg-white text-[#6B6668]">
      {/* 1. HEADER & NAVIGATION (Clean 3-Zone Top Bar Contract) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-[#EDEADE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <a href="#top" className="shrink-0 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#5B9D3F] rounded">
            <EmieLogo />
          </a>

          {/* Zone 2: 4 Single-line Nav Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-8 text-sm font-medium text-[#444343]"
          >
            <a
              href="#top"
              className="hover:text-[#5B9D3F] transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.home}
            </a>
            <a
              href="#about"
              className="hover:text-[#5B9D3F] transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.about}
            </a>
            <a
              href="#services"
              className="hover:text-[#5B9D3F] transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.services}
            </a>
            <a
              href="#contact"
              className="hover:text-[#5B9D3F] transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.contact}
            </a>
          </nav>

          {/* Zone 3: Language Switcher + Primary CTA */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            <LanguageSwitcher enabledLanguages={settings.enabledLanguages} />
            <button
              type="button"
              onClick={() => openBooking()}
              className="px-5 py-2.5 rounded-lg bg-[#444343] text-white text-sm font-medium hover:bg-[#5B9D3F] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.nav.bookNow}
            </button>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            <LanguageSwitcher enabledLanguages={settings.enabledLanguages} />
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              className="p-2.5 rounded-lg border border-[#EDEADE] text-[#444343] cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#EDEADE] bg-white px-4 py-5 space-y-4">
            <nav className="flex flex-col space-y-3 text-base font-medium text-[#444343]">
              <a href="#top" onClick={() => setMobileMenuOpen(false)}>
                {t.nav.home}
              </a>
              <a href="#about" onClick={() => setMobileMenuOpen(false)}>
                {t.nav.about}
              </a>
              <a href="#services" onClick={() => setMobileMenuOpen(false)}>
                {t.nav.services}
              </a>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)}>
                {t.nav.contact}
              </a>
            </nav>
            <div className="pt-3 border-t border-[#EDEADE] flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => openBooking()}
                className="w-full py-3 rounded-lg bg-[#444343] text-white text-sm font-medium cursor-pointer"
              >
                {t.nav.bookNow}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSelfServiceOpen(true);
                }}
                className="w-full py-2.5 rounded-lg border border-[#5B9D3F] text-sm font-medium text-[#5B9D3F] cursor-pointer"
              >
                {t.footer.manageBooking}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigateAdmin();
                }}
                className="w-full py-2.5 rounded-lg border border-[#EDEADE] text-sm font-medium text-[#444343] cursor-pointer"
              >
                {t.nav.adminPortal}
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* 2. HERO SECTION */}
        <section className="bg-[#F6F2E9] border-b border-[#EDEADE]">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-14 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <p className="text-xs sm:text-sm font-medium tracking-[0.14em] uppercase text-[#5B9D3F]">
                {t.hero.kicker}
              </p>
              <h1
                className="font-display font-light text-[#444343] leading-[1.1] tracking-tight"
                style={{
                  fontSize: 'clamp(2.25rem, 4vw, 3.75rem)',
                  textWrap: 'balance',
                }}
              >
                {heroHeadline}
              </h1>
              <p className="text-base sm:text-lg text-[#6B6668] leading-relaxed max-w-xl">
                {heroSubheadline}
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => openBooking()}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg bg-[#444343] text-white text-sm font-medium hover:bg-[#5B9D3F] transition-colors whitespace-nowrap cursor-pointer"
                >
                  {t.hero.primaryCta}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#services"
                  className="inline-flex items-center px-6 py-3.5 rounded-lg border border-[#444343]/20 bg-white/70 text-[#444343] text-sm font-medium hover:border-[#5B9D3F] transition-colors whitespace-nowrap"
                >
                  {t.hero.secondaryCta}
                </a>
              </div>
              <div className="pt-4 border-t border-[#EDEADE] flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#6B6668]">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#5B9D3F]" />
                  {t.hero.locationLabel}
                </span>
                <span aria-hidden="true">·</span>
                <a
                  href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-1.5 hover:text-[#444343] tabular-nums"
                  dir="ltr"
                >
                  <Phone className="w-3.5 h-3.5 text-[#5B9D3F]" />
                  {settings.phone}
                </a>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setSelfServiceOpen(true)}
                  className="inline-flex items-center gap-1.5 font-medium text-[#5B9D3F] hover:text-[#444343] underline underline-offset-4 transition-colors cursor-pointer"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  {t.footer.manageBooking}
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 min-h-[340px] lg:min-h-[480px] rounded-xl overflow-hidden border border-[#EDEADE] bg-white">
              <ClinicImage
                src="/src/assets/images/hero_emie_clinic_1795021968793.jpg"
                alt="EMIE CLINIC Casablanca — Espace d'accueil apaisant"
                className="w-full h-full object-cover object-[85%_center]"
              />
            </div>
          </div>
        </section>

        {/* 3. WELCOME TO EMIE CLINIC */}
        <section className="py-16 lg:py-24 bg-white border-b border-[#EDEADE]">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            <div className="lg:col-span-5 space-y-3">
              <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#5B9D3F]">
                {t.welcome.eyebrow}
              </p>
              <h2 className="font-display font-light text-2xl sm:text-3xl text-[#444343] leading-snug">
                {t.welcome.title}
              </h2>
            </div>
            <div className="lg:col-span-7 space-y-4 text-base sm:text-[17px] text-[#6B6668] leading-[1.65]">
              <p>{t.welcome.paragraph1}</p>
              <p>{t.welcome.paragraph2}</p>
            </div>
          </div>
        </section>

        {/* 4. ABOUT THE CLINIC */}
        <section id="about" className="py-16 lg:py-24 bg-[#F9F9F9] border-b border-[#EDEADE]">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="max-w-3xl space-y-3 mb-12">
              <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#5B9D3F]">
                {t.about.eyebrow}
              </p>
              <h2 className="font-display font-light text-3xl sm:text-4xl text-[#444343] leading-tight">
                {t.about.title}
              </h2>
              <p className="text-base sm:text-[17px] text-[#6B6668] pt-2">
                {t.about.lead}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {t.about.pillars.map((pillar, idx) => (
                <div
                  key={pillar.title}
                  className="bg-white rounded-xl border border-[#EDEADE] p-6 space-y-3"
                >
                  <div className="text-xs font-mono-tabular text-[#5B9D3F] font-medium">
                    0{idx + 1}
                  </div>
                  <h3 className="font-display text-lg font-medium text-[#444343]">
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-[#6B6668] leading-relaxed">{pillar.detail}</p>
                </div>
              ))}
            </div>

            <p className="mt-10 text-base text-[#444343] max-w-3xl leading-relaxed">
              {t.about.closing}
            </p>
          </div>
        </section>

        {/* 5. OUR SERVICES (Strictly the 5 official EMIE CLINIC services) */}
        <section id="services" className="py-16 lg:py-24 bg-white border-b border-[#EDEADE]">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div className="max-w-2xl space-y-3">
                <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#5B9D3F]">
                  {t.servicesSection.eyebrow}
                </p>
                <h2 className="font-display font-light text-3xl sm:text-4xl text-[#444343]">
                  {t.servicesSection.title}
                </h2>
                <p className="text-base text-[#6B6668]">{t.servicesSection.subtitle}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
              {activeServices.map((service, idx) => {
                const localized = t.servicesSection.officialDescriptions[service.serviceId];
                const name = localized?.name || service.name;
                const desc =
                  language === 'fr'
                    ? service.description || localized?.description || ''
                    : localized?.description || service.description;
                const imgSrc =
                  service.imagePath || SERVICE_IMAGES_BY_SLUG[service.serviceId];
                // Asymmetric editorial rhythm: first 2 cards span 3 cols, next 3 cards span 2 cols
                const colSpan = idx < 2 ? 'md:col-span-3' : 'md:col-span-2';

                return (
                  <article
                    key={service.id}
                    className={`${colSpan} flex flex-col bg-[#F9F9F9] rounded-xl border border-[#EDEADE] overflow-hidden`}
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-[#F6F2E9]">
                      <ClinicImage
                        src={imgSrc}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between gap-5 bg-white">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2 text-xs text-[#6B6668]">
                          <span className="font-mono-tabular text-[#5B9D3F]">
                            0{idx + 1}
                          </span>
                          <span className="tabular-nums">
                            {service.durationMinutes} {t.servicesSection.durationUnit}
                          </span>
                        </div>
                        <h3 className="font-display text-xl font-normal text-[#444343]">
                          {name}
                        </h3>
                        <p className="text-sm text-[#6B6668] leading-relaxed">{desc}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => openBooking(service.id)}
                        className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-lg border border-[#EDEADE] text-sm font-medium text-[#444343] hover:border-[#5B9D3F] hover:text-[#5B9D3F] transition-colors cursor-pointer"
                      >
                        <span>{t.servicesSection.bookService}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* 6. WHY CHOOSE EMIE CLINIC */}
        <section className="py-16 lg:py-24 bg-[#F6F2E9] border-b border-[#EDEADE]">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="max-w-2xl space-y-3 mb-12">
              <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#5B9D3F]">
                {t.whyChoose.eyebrow}
              </p>
              <h2 className="font-display font-light text-3xl sm:text-4xl text-[#444343]">
                {t.whyChoose.title}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {t.whyChoose.items.map((item) => (
                <div
                  key={item.number}
                  className="bg-white rounded-xl border border-[#EDEADE] p-7 flex items-start gap-5"
                >
                  <span className="font-mono-tabular text-sm font-medium text-[#5B9D3F] pt-1 shrink-0">
                    {item.number}
                  </span>
                  <div className="space-y-2">
                    <h3 className="font-display text-lg font-medium text-[#444343]">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#6B6668] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. APPOINTMENT BOOKING CALL-TO-ACTION */}
        <section className="py-16 lg:py-20 bg-[#444343] text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <h2 className="font-display font-light text-2xl sm:text-3xl text-white">
                {t.ctaBand.title}
              </h2>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed">
                {t.ctaBand.subtitle}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelfServiceOpen(true)}
                className="px-5 py-3.5 rounded-lg border border-white/30 text-white text-sm font-medium hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer"
              >
                {t.footer.manageBooking}
              </button>
              <button
                type="button"
                onClick={() => openBooking()}
                className="px-7 py-3.5 rounded-lg bg-[#AFC9A3] text-[#444343] text-sm font-semibold hover:bg-white transition-colors whitespace-nowrap cursor-pointer"
              >
                {t.ctaBand.button}
              </button>
            </div>
          </div>
        </section>

        {/* 8. CONTACT & 9. INSTAGRAM SECTION */}
        <section id="contact" className="py-16 lg:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-3">
                <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#5B9D3F]">
                  {t.contact.eyebrow}
                </p>
                <h2 className="font-display font-light text-3xl sm:text-4xl text-[#444343]">
                  {t.contact.title}
                </h2>
              </div>

              <div className="divide-y divide-[#EDEADE] border-t border-b border-[#EDEADE]">
                <div className="py-5 flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-[#5B9D3F] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-[#6B6668]">
                      {t.contact.addressLabel}
                    </div>
                    <p className="text-base text-[#444343] mt-1 leading-relaxed">
                      {settings.address}
                    </p>
                  </div>
                </div>

                <div className="py-5 flex items-start gap-4">
                  <Phone className="w-5 h-5 text-[#5B9D3F] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-[#6B6668]">
                      {t.contact.phoneLabel}
                    </div>
                    <a
                      href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                      dir="ltr"
                      className="inline-block text-lg font-medium text-[#444343] hover:text-[#5B9D3F] mt-1 tabular-nums"
                    >
                      {settings.phone}
                    </a>
                  </div>
                </div>

                <div className="py-5 flex items-start gap-4">
                  <Clock className="w-5 h-5 text-[#5B9D3F] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-[#6B6668]">
                      {t.contact.hoursLabel}
                    </div>
                    <p className="text-sm text-[#444343] mt-1">
                      {settings.openingHours.trim()
                        ? settings.openingHours
                        : t.contact.hoursNotConfigured}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 9. INSTAGRAM SECTION */}
            <div className="lg:col-span-5 bg-[#F6F2E9] rounded-xl border border-[#EDEADE] p-8 flex flex-col justify-between gap-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.14em] uppercase text-[#5B9D3F]">
                  <Instagram className="w-4 h-4" />
                  {t.contact.instagramLabel}
                </div>
                <h3 className="font-display font-light text-2xl text-[#444343]">
                  {t.contact.instagramTitle}
                </h3>
                <p className="text-sm text-[#6B6668] leading-relaxed">
                  {t.contact.instagramBody}
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="aspect-square rounded-lg overflow-hidden border border-[#EDEADE]">
                    <ClinicImage
                      src="/src/assets/images/service_visage_1795021970454.jpg"
                      alt="Soins du visage EMIE CLINIC"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="aspect-square rounded-lg overflow-hidden border border-[#EDEADE]">
                    <ClinicImage
                      src="/src/assets/images/service_amincissement_1795021969772.jpg"
                      alt="Amincissement EMIE CLINIC"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="aspect-square rounded-lg overflow-hidden border border-[#EDEADE]">
                    <ClinicImage
                      src="/src/assets/images/service_cupping_1795021969470.jpg"
                      alt="Cupping EMIE CLINIC"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-white border border-[#EDEADE] text-sm font-medium text-[#444343] hover:border-[#5B9D3F] hover:text-[#5B9D3F] transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                  {t.contact.instagramCta}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 10. FOOTER */}
      <footer className="bg-[#F9F9F9] border-t border-[#EDEADE] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <EmieLogo compact />
            <p className="text-xs text-[#6B6668]">
              © {new Date().getFullYear()} {t.footer.rights}
            </p>
            <p className="text-xs text-[#6B6668]">{t.footer.privacyNotice}</p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-[#444343]">
            <a href="#about" className="hover:text-[#5B9D3F] transition-colors">
              {t.nav.about}
            </a>
            <a href="#services" className="hover:text-[#5B9D3F] transition-colors">
              {t.nav.services}
            </a>
            <a href="#contact" className="hover:text-[#5B9D3F] transition-colors">
              {t.nav.contact}
            </a>
            <button
              type="button"
              onClick={() => setSelfServiceOpen(true)}
              className="text-xs font-medium text-[#5B9D3F] hover:text-[#444343] underline underline-offset-4 cursor-pointer"
            >
              {t.footer.manageBooking}
            </button>
            <button
              type="button"
              onClick={onNavigateAdmin}
              className="text-xs font-medium text-[#6B6668] hover:text-[#444343] underline underline-offset-4 cursor-pointer"
            >
              {t.footer.staffAccess}
            </button>
          </div>
        </div>
      </footer>

      <BookingModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        services={services}
        settings={settings}
        preselectedServiceId={selectedServiceId}
      />
      <SelfServiceModal
        isOpen={selfServiceOpen}
        onClose={() => setSelfServiceOpen(false)}
      />
    </div>
  );
}
