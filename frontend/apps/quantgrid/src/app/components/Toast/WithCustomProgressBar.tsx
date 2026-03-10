import { HTMLAttributes } from 'react';
import { ToastContentProps } from 'react-toastify';

export function WithCustomProgressBar({
  closeToast,
  isPaused,
  toastProps,
  data,
}: ToastContentProps<{ message: string }>) {
  const strokeDash = 565.48;
  const attributes: HTMLAttributes<SVGCircleElement> = {};

  // handle controlled progress bar
  // controlled progress bar uses a transition
  if (typeof toastProps.progress === 'number') {
    attributes.style = {
      transition: 'all .1s linear',
      strokeDashoffset: `${strokeDash - strokeDash * toastProps.progress}px`,
    };

    if (toastProps.progress >= 1) {
      attributes.onTransitionEnd = () => {
        closeToast?.();
      };
    }
  } else {
    // normal autoclose uses an animation
    // animation inside index.css
    attributes.className = 'animate-radial-progress';
    attributes.style = {
      animationDuration: `${toastProps.autoClose}ms`,
      animationPlayState: isPaused ? 'paused' : 'running',
    };

    attributes.onAnimationEnd = () => {
      closeToast?.();
    };
  }

  return (
    <div className="flex justify-between items-center w-full">
      <p>{data.message}</p>
      <span className="relative shrink-0">
        <svg
          className="-rotate-90"
          height="50"
          version="1.1"
          viewBox="-25 -25 250 250"
          width="50"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="100"
            cy="100"
            fill="transparent"
            r="90"
            stroke="var(--color-stroke-secondary)"
            strokeWidth="20"
          />
          <circle
            cx="100"
            cy="100"
            fill="transparent"
            r="90"
            stroke="var(--color-stroke-accent-primary)"
            strokeDasharray={`${strokeDash}px`}
            strokeLinecap="round"
            strokeWidth="20"
            {...attributes}
          />
        </svg>
        {toastProps.progress !== undefined && (
          <div className="absolute top-0 left-0 z-10 size-full text-xs flex items-center justify-center">
            <span>{Math.round(toastProps.progress * 100)}%</span>
          </div>
        )}
      </span>
    </div>
  );
}
