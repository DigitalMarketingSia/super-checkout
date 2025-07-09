
export const LoadingState = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="h-96 bg-gray-800 rounded-lg animate-pulse" />
    </div>
  );
};
