import { useEffect, useMemo, useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';

const DESIGN_WIDTH = 1600;
const DESIGN_HEIGHT = 900;

interface ScaledStageProps {
  children: ReactNode;
}

const getScale = () => {
  if (typeof window === 'undefined') {
    return 1;
  }

  const { innerWidth, innerHeight } = window;
  return Math.min(innerWidth / DESIGN_WIDTH, innerHeight / DESIGN_HEIGHT);
};

export function ScaledStage({ children }: ScaledStageProps) {
  const [scale, setScale] = useState<number>(() => getScale());

  useEffect(() => {
    const handleResize = () => {
      setScale(getScale());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scaledDimensions = useMemo(() => ({
    width: DESIGN_WIDTH * scale,
    height: DESIGN_HEIGHT * scale,
  }), [scale]);

  const stageStyle: CSSProperties = useMemo(() => ({
    width: `${DESIGN_WIDTH}px`,
    height: `${DESIGN_HEIGHT}px`,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  }), [scale]);

  return (
    <div className="stage-wrapper">
      <div
        className="stage-aligner"
        style={{
          width: `${scaledDimensions.width}px`,
          height: `${scaledDimensions.height}px`,
        }}
      >
        <div className="stage-content" style={stageStyle}>
          {children}
        </div>
      </div>
    </div>
  );
}

export const STAGE_DIMENSIONS = {
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
};
