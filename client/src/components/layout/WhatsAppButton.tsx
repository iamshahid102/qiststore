import { FaWhatsapp } from 'react-icons/fa';

/** Floating WhatsApp support button. */
export function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/9221111115566"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-2xl text-white shadow-xl transition hover:scale-105"
    >
      <FaWhatsapp aria-hidden />
    </a>
  );
}
