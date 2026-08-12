import React from 'react';
import { DISTRICT_COPY, type ExperienceDistrict } from '../experience';
import type { SemanticEvent } from '../semantic-trace/schema';

export function EvidenceCityMap({
  event,
  activeDistrict,
  artifact = 'ambient',
  error,
  onOpenExplorer,
  onRetry,
}: {
  event?: SemanticEvent;
  activeDistrict?: ExperienceDistrict | null;
  artifact?: string;
  error?: Error;
  onOpenExplorer?: () => void;
  onRetry?: () => void;
}) {
  return (
    <div
      className={`fallback-city-map ${error ? 'scene-error-fallback' : ''}`}
      role={error ? 'region' : undefined}
      aria-label={error ? '3D rendering fallback' : 'Pi City evidence map'}
    >
      {(['arrival', 'session', 'context', 'model', 'tool'] as const).map((district) => (
        <div key={district} className={`fallback-district ${activeDistrict === district ? 'active' : ''}`}>
          <small>{district}</small>
          <strong>{DISTRICT_COPY[district].title}</strong>
        </div>
      ))}
      {error && (
        <section className="scene-error-panel">
          <small>FALLBACK · EVIDENCE REMAINS AVAILABLE</small>
          <h2>3D rendering failed</h2>
          <p>{error.message.slice(0, 180)}</p>
          <div>
            {onOpenExplorer && <button className="primary" onClick={onOpenExplorer}>Open Evidence Explorer</button>}
            {onRetry && <button onClick={onRetry}>Retry 3D</button>}
          </div>
        </section>
      )}
      <div className="three-legend visual-beta-legend">
        <span>{event?.type ?? 'evidence map'}</span>
        <strong>{artifact}</strong>
      </div>
    </div>
  );
}

export class SceneErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    event?: SemanticEvent;
    activeDistrict?: ExperienceDistrict | null;
    artifact?: string;
    onOpenExplorer?: () => void;
  },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Pi City scene failed; showing evidence fallback.', error);
  }

  render() {
    if (this.state.error) {
      return (
        <EvidenceCityMap
          event={this.props.event}
          activeDistrict={this.props.activeDistrict}
          artifact={this.props.artifact}
          error={this.state.error}
          onOpenExplorer={this.props.onOpenExplorer}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
