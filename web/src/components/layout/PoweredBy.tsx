import * as Conf from "@/Conf";
import {New901Mark} from "@/components/brand/New901Mark";
import {useIsDark} from "@/hooks/use-theme";
/**
 * The default footer: New901 mark + "Powered by New901". A deployment can
 * replace the whole line through `Conf.CustomFooter` or an application's
 * `footerHtml`.
 */
export function PoweredBy({dark = false}: {dark?: boolean}) {
  const isDark = useIsDark() || dark;

  if (Conf.CustomFooter !== null) {
    return <>{Conf.CustomFooter}</>;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <New901Mark />
      Powered by New901
    </span>
  );
}
