import Button from "../components/ui/Button";

function DevButtons() {
  const variants = ["primary", "secondary", "outline", "outlineDark"] as const;
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-16 px-4 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-zinc-800 pb-6">
          <h1 className="text-4xl font-extrabold text-purple-600 dark:text-purple-400">
            Button Component Showcase
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Explore and review all variants, states, and responsive styling of the shared <code className="bg-purple-100 dark:bg-purple-950/50 px-2 py-1 rounded text-sm text-purple-700 dark:text-purple-300">Button</code> component.
          </p>
        </div>

        {/* Side-by-side Light & Dark mode containers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Light Theme Panel */}
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-xl space-y-8">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800">Light Mode Preview</h2>
              <span className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">Default</span>
            </div>
            
            <div className="space-y-6">
              {variants.map((variant) => (
                <div key={variant} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="space-y-1">
                    <span className="text-sm font-mono font-bold text-gray-400 capitalize">{variant}</span>
                    <p className="text-xs text-gray-500 max-w-xs">
                      {variant === "primary" && "Main actions, call-to-actions, and highlights."}
                      {variant === "secondary" && "Alternative focus, highlights, and secondary steps."}
                      {variant === "outline" && "Minimalist borders, transparent background, highly adaptive."}
                      {variant === "outlineDark" && "Dual action outline with gray background contrast."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant={variant}>
                      {variant} Button
                    </Button>
                    <Button variant={variant} disabled>
                      Disabled
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dark Theme Panel */}
          <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 shadow-2xl space-y-8 text-white">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-xl font-bold text-zinc-100">Dark Mode Preview</h2>
              <span className="bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">Active</span>
            </div>
            
            <div className="space-y-6">
              {variants.map((variant) => (
                <div key={variant} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-800">
                  <div className="space-y-1">
                    <span className="text-sm font-mono font-bold text-zinc-500 capitalize">{variant}</span>
                    <p className="text-xs text-zinc-400 max-w-xs">
                      {variant === "primary" && "Vibrant purple gradient with hover adjustments."}
                      {variant === "secondary" && "Sky blue outline with glowing interactions."}
                      {variant === "outline" && "Clean white outline, transparent, smooth inversion."}
                      {variant === "outlineDark" && "Bold border with dark-slate high-contrast background."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant={variant}>
                      {variant} Button
                    </Button>
                    <Button variant={variant} disabled>
                      Disabled
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Styling Reference Card */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-8 shadow-md">
          <h2 className="text-xl font-bold text-gray-800 dark:text-zinc-100 mb-4">Tailwind Reference Classes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-zinc-950 rounded-xl space-y-2">
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">Primary:</span>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono text-gray-600 dark:text-zinc-400">
                border-2 border-purple-800 bg-purple-800 text-white dark:border-purple-400 dark:bg-purple-500 dark:text-white hover:bg-purple-900 dark:hover:bg-purple-400 focus:ring-purple-600
              </pre>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-zinc-950 rounded-xl space-y-2">
              <span className="text-sm font-bold text-sky-600 dark:text-sky-400">Secondary:</span>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono text-gray-600 dark:text-zinc-400">
                border-2 border-sky-600 bg-sky-600 text-white dark:border-sky-400 dark:bg-sky-500 dark:text-white hover:bg-sky-700 dark:hover:bg-sky-400 focus:ring-sky-400 dark:focus:ring-sky-300
              </pre>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-zinc-950 rounded-xl space-y-2">
              <span className="text-sm font-bold text-gray-800 dark:text-zinc-200">Outline:</span>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono text-gray-600 dark:text-zinc-400">
                border-2 border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black focus:ring-black dark:focus:ring-gray-300
              </pre>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-zinc-950 rounded-xl space-y-2">
              <span className="text-sm font-bold text-gray-800 dark:text-zinc-200">Outline Dark:</span>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono text-gray-600 dark:text-zinc-400">
                border-2 border-black bg-gray-100 text-black dark:border-white dark:bg-gray-800 dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black focus:ring-black
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DevButtons;
