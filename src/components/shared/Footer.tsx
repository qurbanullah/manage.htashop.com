export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-gray-50 py-3 text-center text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
      <div className="mx-auto max-w-[1440px] space-y-1 px-4">
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>&copy; {year} HTAShop</span>
          <span aria-hidden="true">|</span>
          <a href="https://htashop.com/terms" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 hover:underline dark:hover:text-gray-200">Terms</a>
          <span aria-hidden="true">|</span>
          <a href="https://htashop.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 hover:underline dark:hover:text-gray-200">Privacy</a>
          <span aria-hidden="true">|</span>
          <a href="https://htashop.com/contact" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 hover:underline dark:hover:text-gray-200">Contact</a>
        </p>
        <p>
          A product of{" "}
          <a href="https://htasol.com" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-gray-700 hover:underline dark:hover:text-gray-200">
            High Tech Advancement Solutions (Private) Limited
          </a>
          <span aria-hidden="true"> | </span>
          <span>CUIN 0321375</span>
        </p>
      </div>
    </footer>
  );
}
