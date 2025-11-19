interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;
        const isUpcoming = stepNumber > currentStep;

        return (
          <div
            key={stepNumber}
            className={`h-2 w-2 rounded-full transition-all ${
              isActive
                ? "bg-gray-900"
                : isCompleted
                ? "bg-gray-500"
                : "border-2 border-gray-300 bg-transparent"
            }`}
          />
        );
      })}
    </div>
  );
}
