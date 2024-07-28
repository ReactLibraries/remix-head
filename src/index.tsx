import React, {
  FC,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";

const DATA_NAME = "__REMIX_HEAD_VALUE__";
const isServerSide = typeof window === "undefined";

export type ContextType<T = ReactNode[]> = {
  state: T;
  storeChanges: Set<() => void>;
  dispatch: (callback: (state: T) => T) => void;
  subscribe: (onStoreChange: () => void) => () => void;
  promise: Promise<void>;
  resolve: () => void;
  finished: boolean;
};

export const useCreateHeadContext = <T,>(initState: () => T) => {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  const context = useRef<ContextType<T>>({
    state: initState(),
    storeChanges: new Set(),
    dispatch: (callback) => {
      context.state = callback(context.state);
      context.storeChanges.forEach((storeChange) => storeChange());
    },
    subscribe: (onStoreChange) => {
      context.storeChanges.add(onStoreChange);
      return () => {
        context.storeChanges.delete(onStoreChange);
      };
    },
    promise,
    resolve,
    finished: false,
  }).current;
  return context;
};

const HeadContext = createContext<
  ContextType<{ type: string; props: Record<string, unknown> }[][]>
>(undefined as never);

const Wait = () => {
  const context = useContext(HeadContext);
  if (!context.finished) {
    context.finished = true;
    context.resolve();
  }
  return null;
};

export const RemixHeadProvider = ({ children }: { children: ReactNode }) => {
  const context = useCreateHeadContext<
    { type: string; props: Record<string, unknown> }[][]
  >(() => {
    if (typeof window !== "undefined") {
      return [
        JSON.parse(
          document.querySelector(`script#${DATA_NAME}`)?.textContent ?? "{}"
        ),
      ];
    }
    return [[]];
  });
  return (
    <HeadContext.Provider value={context}>
      {children}
      <Wait />
    </HeadContext.Provider>
  );
};

export const RemixHeadRoot: FC = () => {
  const context = useContext(HeadContext);
  if (isServerSide && !context.finished) {
    throw context.promise;
  }
  const state = useSyncExternalStore(
    context.subscribe,
    () => context.state,
    () => context.state
  );
  useEffect(() => {
    context.dispatch(() => {
      return [];
    });
  }, [context]);
  const heads = state.flat();
  return (
    <>
      <script
        id={DATA_NAME}
        type="application/json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(heads).replace(/</g, "\\u003c"),
        }}
      />
      {heads.map(({ type: Tag, props }, index) => (
        <Tag key={`HEAD${Tag}${index}`} {...props} />
      ))}
    </>
  );
};
export const RemixHead: FC<{ children: ReactNode }> = ({ children }) => {
  const context = useContext(HeadContext);
  useEffect(() => {
    const value = extractInfoFromChildren(children);
    context.dispatch((heads) => [...heads, value]);
    return () => {
      context.dispatch((heads) => heads.filter((head) => head !== value));
    };
  }, [children, context]);

  if (isServerSide) {
    context.dispatch((heads) => [...heads, extractInfoFromChildren(children)]);
  }
  return null;
};

const extractInfoFromChildren = (
  children: ReactNode
): { type: string; props: Record<string, unknown> }[] =>
  React.Children.toArray(children).flatMap((child) => {
    if (React.isValidElement(child)) {
      if (child.type === React.Fragment) {
        return extractInfoFromChildren(child.props.children);
      }
      if (typeof child.type === "string") {
        return [{ type: child.type, props: child.props }];
      }
    }
    return [];
  });
