import type { ReactNode } from "react";

export type SectionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export const Section = ({ title, description, action, children }: SectionProps) => (
  <section>
    <header>
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </header>
    {children}
  </section>
);
