interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex justify-center items-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`px-4 py-2 rounded-lg border transition-colors cursor-pointer ${
          currentPage === 1
            ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-[#2093c4] text-white border-[#2093c4] hover:bg-[#1a7ba0]"
        }`}
      >
        Anterior
      </button>

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-4 py-2 rounded-lg border transition-colors cursor-pointer ${
            currentPage === page
              ? "bg-[#2093c4] text-white border-[#2093c4]"
              : "border-gray-300 dark:border-gray-600 hover:bg-[#2093c4]/10 dark:hover:bg-[#2093c4]/20 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          }`}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`px-4 py-2 rounded-lg border transition-colors cursor-pointer ${
          currentPage === totalPages
            ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-[#2093c4] text-white border-[#2093c4] hover:bg-[#1a7ba0]"
        }`}
      >
        Siguiente
      </button>
    </div>
  );
}

export default Pagination;
