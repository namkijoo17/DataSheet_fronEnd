import Image from 'next/image';

export function BrandHeader() {
  return (
    <header className="flex flex-col items-center gap-4 text-center">
      <Image
        src="/brand/ecotronix-logo.png"
        alt="ECOTRONIX CORP."
        width={476}
        height={75}
        priority
        className="h-14 w-auto md:h-16"
      />
      <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
        데이터시트 전자입력 시스템
      </h1>
    </header>
  );
}
