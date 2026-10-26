import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Card, EmptyState } from '../components/ui/States';

export function NotFoundPage() {
  return (
    <Card>
      <EmptyState
        icon={<Compass />}
        title="Page not found"
        description="The page you’re looking for doesn’t exist."
        action={
          <Link to="/" className="text-brand-600 hover:text-brand-700 text-sm font-medium">
            Back to dashboard
          </Link>
        }
      />
    </Card>
  );
}
