import React from 'react';
import { cn } from '@/lib/utils';

type UsernameProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: keyof JSX.IntrinsicElements;
  title?: string;
  onClick?: React.MouseEventHandler;
};

export default function Username({
  children,
  className,
  style,
  as = 'span',
  title,
  onClick,
}: UsernameProps) {
  const Component = as as any;
  return (
    <Component
      dir="auto"
      className={cn(className)}
      style={{ unicodeBidi: 'plaintext' as any, ...style }}
      title={title}
      onClick={onClick}
    >
      <bdi dir="auto">{children}</bdi>
    </Component>
  );
}

