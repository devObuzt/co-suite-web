"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ContactIcon } from "@/components/ex/bc/ContactIcon";
import type { BusinessCard as BusinessCardData, ContactTile } from "@/lib/ex/bc/types";
import styles from "./BusinessCard.module.css";

const ICON_SIZE = 26;

/**
 * Copies text, with a fallback for the in-app browsers a QR-scanned card
 * often opens in, where the async Clipboard API is unavailable or blocked.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fall through to the legacy path
  }

  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(field);
    field.select();
    field.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(field);
    return ok;
  } catch {
    return false;
  }
}

/** Icon + caption. Copies `copyText` when the tile has one. */
function TileHead({
  tile,
  onCopy,
}: {
  tile: ContactTile;
  onCopy: (text: string) => void;
}) {
  const body = (
    <>
      <ContactIcon kind={tile.kind} size={ICON_SIZE} />
      <span className={styles.label} dir="auto">
        {tile.label}
      </span>
    </>
  );

  if (!tile.copyText) return body;

  return (
    <button
      type="button"
      className={styles.copyButton}
      onClick={() => onCopy(tile.copyText as string)}
      aria-label={`${tile.label}: ${tile.value} — העתקה`}
    >
      {body}
    </button>
  );
}

function Tile({ tile, onCopy }: { tile: ContactTile; onCopy: (text: string) => void }) {
  const external = tile.href?.startsWith("http");
  const value = tile.href ? (
    <a
      className={styles.value}
      dir="auto"
      href={tile.href}
      aria-label={tile.ariaLabel ?? `${tile.label}: ${tile.value}`}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {tile.value}
    </a>
  ) : (
    <span className={styles.value} dir="auto">
      {tile.value}
    </span>
  );

  // Tiles that only navigate wrap head + value in one large tap target; tiles
  // that also copy keep the two actions separate so each stays reachable.
  if (tile.href && !tile.copyText) {
    return (
      <div className={styles.tile}>
        <a
          className={styles.tileAction}
          href={tile.href}
          aria-label={tile.ariaLabel ?? `${tile.label}: ${tile.value}`}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          <ContactIcon kind={tile.kind} size={ICON_SIZE} />
          <span className={styles.label} dir="auto">
        {tile.label}
      </span>
          <span className={styles.value} dir="auto">
            {tile.value}
          </span>
        </a>
      </div>
    );
  }

  return (
    <div className={styles.tile}>
      <TileHead tile={tile} onCopy={onCopy} />
      {value}
    </div>
  );
}

export function BusinessCard({ card }: { card: BusinessCardData }) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = useCallback(
    async (text: string) => {
      // No toast when the copy didn't happen — the Waze link on the value is
      // still there, so a silent no-op beats claiming a copy that never landed.
      if (!(await copyText(text))) return;

      setToast(card.copiedMessage);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(null), 3000);
    },
    [card.copiedMessage],
  );

  return (
    <div className={styles.page}>
      <main
        className={styles.card}
        lang={card.lang}
        dir={card.dir}
        style={
          {
            "--bc-frame": card.theme.frame,
            "--bc-chip": card.theme.chip,
            "--bc-chip-text": card.theme.chipText,
            "--bc-contact-text": card.theme.contactText,
          } as React.CSSProperties
        }
      >
        <Image
          className={styles.photo}
          src={card.photo.src}
          alt={card.photo.alt}
          fill
          sizes="(max-width: 705px) 100vw, 705px"
          priority
        />
        <div className={styles.scrim} aria-hidden="true" />

        <div className={styles.content}>
          <div className={styles.introRow}>
            <div className={styles.intro}>
              {card.logo &&
                (card.logo.href ? (
                  <a
                    className={styles.logoLink}
                    href={card.logo.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Image
                      className={styles.logo}
                      src={card.logo.src}
                      alt={card.logo.alt}
                      width={card.logo.width}
                      height={Math.round(card.logo.width * 0.234)}
                      priority
                    />
                  </a>
                ) : (
                  <Image
                    className={styles.logo}
                    src={card.logo.src}
                    alt={card.logo.alt}
                    width={card.logo.width}
                    height={Math.round(card.logo.width * 0.234)}
                    priority
                  />
                ))}

              <h1 className={styles.chip}>{card.headings[0]}</h1>
              {card.headings.slice(1).map((line) => (
                <p key={line} className={styles.chip}>
                  {line}
                </p>
              ))}
            </div>
          </div>

          <div />

          <div className={styles.contactsRow}>
            <div className={styles.contacts}>
              {card.contacts.map((tile) => (
                <Tile key={`${tile.kind}-${tile.value}`} tile={tile} onCopy={copy} />
              ))}
            </div>
          </div>
        </div>

        <div
          className={`${styles.toast} ${toast ? styles.toastVisible : ""}`}
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      </main>
    </div>
  );
}
