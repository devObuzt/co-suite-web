import type {
  TransitionPresentation,
  TransitionPresentationComponentProps,
} from '@remotion/transitions';
import React, {useMemo} from 'react';
import {AbsoluteFill} from 'remotion';

type ZoomProps = Record<string, never>;

const ZoomPresentation: React.FC<
  TransitionPresentationComponentProps<ZoomProps>
> = ({children, presentationDirection, presentationProgress}) => {
  const isEntering = presentationDirection === 'entering';
  const style = useMemo<React.CSSProperties>(() => {
    // Entering scene zooms in from 1.15 -> 1 and fades in; the outgoing scene
    // zooms out to 0.9 and fades out. Pure CSS transform/opacity — renders
    // headlessly (no WebGL2 context, unlike the built-in zoomInOut shader).
    const scale = isEntering
      ? 1.15 - 0.15 * presentationProgress
      : 1 - 0.1 * presentationProgress;
    const opacity = isEntering ? presentationProgress : 1 - presentationProgress;
    return {transform: `scale(${scale})`, opacity};
  }, [isEntering, presentationProgress]);
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

export const zoom = (): TransitionPresentation<ZoomProps> => {
  return {component: ZoomPresentation, props: {}};
};
