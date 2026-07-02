"use client";

import { useActionState, useEffect, useMemo, useState, type CSSProperties } from "react";
import { updateAppearanceSettings, type AppearanceFormState } from "@/app/actions/appearance";
import { buildMaterialScheme } from "@/lib/theme/scheme";
import { SHAPE_SCALES, type ThemeFontScale, type ThemeMode, type ThemeShape } from "@/lib/theme/css";
import { SEED_PRESETS, MODE_OPTIONS, SHAPE_OPTIONS, FONT_SCALE_OPTIONS } from "@/lib/theme/presets";
import { Button, Badge, Card, useSnackbar } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";

type Draft = {
  seedColor: string;
  mode: ThemeMode;
  shape: ThemeShape;
  fontScale: ThemeFontScale;
};

// MD3 segmented button group (single-select).
function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string; description?: string }[];
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex flex-wrap overflow-hidden rounded-full border border-outline">
      {options.map((option, i) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.description}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-10 items-center gap-1.5 px-4 type-label-large transition-colors",
              i > 0 && "border-l border-outline",
              selected ? "bg-secondary-container text-on-secondary-container" : "text-on-surface hover:bg-on-surface-8"
            )}
          >
            {selected && <Icon name="check" size={16} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// Turns generated scheme vars + shape tokens into inline CSS custom
// properties, so the preview panels re-theme locally without touching
// the real page tokens until the form is saved.
function previewStyle(vars: Record<string, string>, shape: ThemeShape): CSSProperties {
  const style: Record<string, string> = {};
  for (const [role, hex] of Object.entries(vars)) style[`--md-sys-color-${role}`] = hex;
  for (const [token, v] of Object.entries(SHAPE_SCALES[shape])) style[`--md-sys-shape-corner-${token}`] = v;
  return style as CSSProperties;
}

function PreviewPanel({ label, vars, shape }: { label: string; vars: Record<string, string>; shape: ThemeShape }) {
  return (
    <div style={previewStyle(vars, shape)} className="min-w-0 flex-1 rounded-lg bg-surface p-4 ring-1 ring-outline-variant">
      <p className="type-label-medium uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className="mt-2 type-title-medium text-on-surface">Annual Meeting 2026</p>
      <p className="type-body-small text-on-surface-variant">Events · created 2 days ago</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone="success">Healthy</Badge>
        <Badge tone="warning">Pending Review</Badge>
        <Badge tone="danger">Critical</Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="filled" type="button">
          Save
        </Button>
        <Button size="sm" variant="tonal" type="button">
          Preview
        </Button>
        <Button size="sm" variant="outlined" type="button">
          Cancel
        </Button>
      </div>
      <Card className="mt-4 p-3">
        <p className="type-label-large text-on-surface">Storage</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary-container">
          <div className="h-full w-2/3 rounded-full bg-primary" />
        </div>
      </Card>
    </div>
  );
}

export function AppearanceForm({ initial }: { initial: Draft }) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [state, formAction, pending] = useActionState<AppearanceFormState, FormData>(updateAppearanceSettings, undefined);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (state?.status === "success") showSnackbar(state.message);
  }, [state, showSnackbar]);

  const scheme = useMemo(() => buildMaterialScheme(draft.seedColor), [draft.seedColor]);
  const isPreset = SEED_PRESETS.some((p) => p.hex.toLowerCase() === draft.seedColor.toLowerCase());

  return (
    <form action={formAction} className="mt-6 space-y-8">
      <input type="hidden" name="themeSeedColor" value={draft.seedColor} />
      <input type="hidden" name="themeMode" value={draft.mode} />
      <input type="hidden" name="themeShape" value={draft.shape} />
      <input type="hidden" name="themeFontScale" value={draft.fontScale} />

      <section>
        <h2 className="type-title-medium text-on-surface">Brand color</h2>
        <p className="mt-1 type-body-medium text-on-surface-variant">
          Pick a preset or use your exact brand color — the full palette (buttons, badges, surfaces, dark mode) is
          derived from it automatically.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {SEED_PRESETS.map((preset) => {
            const selected = preset.hex.toLowerCase() === draft.seedColor.toLowerCase();
            return (
              <button
                key={preset.hex}
                type="button"
                title={preset.name}
                aria-label={`${preset.name} (${preset.hex})`}
                aria-pressed={selected}
                onClick={() => setDraft((d) => ({ ...d, seedColor: preset.hex }))}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-shadow",
                  selected ? "shadow-elevation-2 outline-2 outline-offset-2 outline-primary" : "hover:shadow-elevation-1"
                )}
                style={{ backgroundColor: preset.hex }}
              >
                {selected && <Icon name="check" size={20} className="text-white" />}
              </button>
            );
          })}
          <label
            className={cn(
              "flex h-10 cursor-pointer items-center gap-2 rounded-full border border-outline px-4 type-label-large text-on-surface hover:bg-on-surface-8",
              !isPreset && "border-primary bg-primary-8 text-primary"
            )}
          >
            <Icon name="colorize" size={18} />
            Custom
            <input
              type="color"
              value={draft.seedColor}
              onChange={(e) => setDraft((d) => ({ ...d, seedColor: e.target.value }))}
              className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
            />
            <span className="type-body-small text-on-surface-variant">{draft.seedColor}</span>
          </label>
        </div>
      </section>

      <section>
        <h2 className="type-title-medium text-on-surface">Default mode</h2>
        <p className="mt-1 type-body-medium text-on-surface-variant">
          The starting point for everyone — each person can still override it from the toggle in the top bar.
        </p>
        <div className="mt-3">
          <Segmented
            ariaLabel="Default color mode"
            value={draft.mode}
            onChange={(mode) => setDraft((d) => ({ ...d, mode }))}
            options={MODE_OPTIONS}
          />
        </div>
      </section>

      <section>
        <h2 className="type-title-medium text-on-surface">Corner shape</h2>
        <div className="mt-3">
          <Segmented
            ariaLabel="Corner shape scale"
            value={draft.shape}
            onChange={(shape) => setDraft((d) => ({ ...d, shape }))}
            options={SHAPE_OPTIONS}
          />
        </div>
      </section>

      <section>
        <h2 className="type-title-medium text-on-surface">Text size</h2>
        <div className="mt-3">
          <Segmented
            ariaLabel="Base text size"
            value={draft.fontScale}
            onChange={(fontScale) => setDraft((d) => ({ ...d, fontScale }))}
            options={FONT_SCALE_OPTIONS}
          />
        </div>
      </section>

      <section>
        <h2 className="type-title-medium text-on-surface">Preview</h2>
        <p className="mt-1 type-body-medium text-on-surface-variant">
          Live preview of the generated palette — nothing changes for anyone until you save.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <PreviewPanel label="Light" vars={scheme.light} shape={draft.shape} />
          <PreviewPanel label="Dark" vars={scheme.dark} shape={draft.shape} />
        </div>
      </section>

      {state?.status === "error" && <p className="type-body-medium text-error">{state.message}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" icon="palette" loading={pending} loadingText="Applying…">
          Apply to organization
        </Button>
        <Button type="button" variant="text" onClick={() => setDraft(initial)}>
          Reset
        </Button>
      </div>
    </form>
  );
}
