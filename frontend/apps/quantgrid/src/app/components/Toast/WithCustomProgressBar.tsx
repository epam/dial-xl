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
      <svg
        className="-rotate-90"
        height="40"
        version="1.1"
        viewBox="-25 -25 250 250"
        width="40"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="100"
          cy="100"
          fill="transparent"
          r="90"
          stroke="var(--stroke-secondary)"
          strokeDasharray={`${strokeDash}px`}
          strokeDashoffset="0"
          strokeWidth="6"
        />
        <circle
          cx="100"
          cy="100"
          fill="transparent"
          r="90"
          stroke="var(--stroke-accent-primary)"
          strokeDasharray={`${strokeDash}px`}
          strokeLinecap="round"
          strokeWidth="16px"
          {...attributes}
        />
      </svg>
    </div>
  );
}
