import { useServices } from "../hooks/useApi";
import { ServiceCard } from "./ServiceCard";
import { Skeleton } from "./ui/skeleton";

export function ServiceGrid() {
  const { services, loading, controlService } = useServices();
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-4 border rounded-lg">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-3 w-full mb-3" />
            <div className="flex gap-1">
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (services.length === 0) {
    return <p className="text-muted-foreground text-sm">No services found</p>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {services.map((service) => (
        <ServiceCard key={service.name} service={service} onControl={controlService} />
      ))}
    </div>
  );
}
