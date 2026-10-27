"use client";

import { createContext, useContext, useTransition } from "react";

// React resets a <form action={…}> after every submission, which wipes what the user typed
// when the server answers with a validation error. ActionForm submits through a transition
// instead, so fields keep their values; SubmitButton reads the pending state from context.

const PendingContext = createContext<boolean | null>(null);

export function useActionFormPending() {
  return useContext(PendingContext);
}

type Props = Omit<React.FormHTMLAttributes<HTMLFormElement>, "action"> & {
  action: (data: FormData) => void;
  ref?: React.Ref<HTMLFormElement>;
};

export function ActionForm({ action, onSubmit, children, ref, ...rest }: Props) {
  const [pending, startTransition] = useTransition();
  return (
    <PendingContext.Provider value={pending}>
      <form
        {...rest}
        ref={ref}
        onSubmit={(e) => {
          onSubmit?.(e);
          if (e.defaultPrevented) return;
          e.preventDefault();
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
          const data = new FormData(e.currentTarget, submitter);
          startTransition(() => action(data));
        }}
      >
        {children}
      </form>
    </PendingContext.Provider>
  );
}
