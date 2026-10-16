import Image from "next/image";

export function CoffeePookie() {
  return (
    <figure className="coffee-pookie">
      <Image
        src="/pookie/pookie-barista-v1.png"
        alt="Pookie in an apron and running shoes, serving a tiny latte beside an espresso machine. The café menu says Tiny latte $8.50 and Foam costs extra."
        width={1254}
        height={1254}
        sizes="(max-width: 768px) 90vw, 480px"
      />
    </figure>
  );
}
