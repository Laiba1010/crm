import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export type NewDealButtonProps = {
  /** Serializable, so it works from a Server Component. Renders a link. */
  href?: string;
  /** For client parents, e.g. to open a create-deal dialog. Renders a button. */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
};

/** The one primary action in the Deals header. Keep it the only filled button there. */
export function NewDealButton({
  href,
  onClick,
  className,
}: NewDealButtonProps) {
  const content = (
    <>
      <Plus aria-hidden data-icon="inline-start" />
      New Deal
    </>
  );

  if (href) {
    return (
      <Button asChild className={className}>
        <Link href={href}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button type="button" onClick={onClick} className={className}>
      {content}
    </Button>
  );
}
