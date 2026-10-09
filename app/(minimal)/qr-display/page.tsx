'use client';

import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';

import { GdgLogo } from '@/components/brand-mark';
import { Door } from '@/components/najdi';

/**
 * The projector screen: the attendance QR on a painted door, big enough to
 * scan from the back of the hall. The code itself always sits on white -
 * scanners need the contrast - whatever the theme.
 */
function QRDisplayContent() {
  const t = useTranslations('attendance.qrDisplay');
  const searchParams = useSearchParams();
  const url = searchParams.get('url');

  if (!url) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-3 p-8 text-center">
        <GdgLogo height={40} />
        <h1 className="font-display text-[26px] leading-tight font-semibold">{t('missingTitle')}</h1>
        <p className="text-ink-2 max-w-md">{t('missingBody')}</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 sm:p-10">
      <div className="flex items-center gap-4">
        <GdgLogo height={44} priority />
        <h1 className="font-display text-[clamp(1.75rem,4vw,3rem)] leading-tight font-semibold">{t('title')}</h1>
      </div>
      <Door tone="ochre" className="w-[min(82vmin,620px)]" innerClassName="items-center px-5 pt-4 pb-5">
        <div className="w-full rounded-sm bg-white p-3 shadow-[inset_0_0_0_1px_var(--door-panel-rule)]">
          <QRCodeSVG
            value={url}
            size={560}
            level="H"
            includeMargin
            className="block h-auto w-full"
            imageSettings={{
              src: '/gdg.ico',
              height: 96,
              width: 96,
              excavate: true,
            }}
          />
        </div>
      </Door>
      <p className="text-ink-2 text-center text-lg">{t('hint')}</p>
    </main>
  );
}

export default function QRDisplayPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-svh items-center justify-center">
          <GdgLogo height={44} />
        </main>
      }
    >
      <QRDisplayContent />
    </Suspense>
  );
}
