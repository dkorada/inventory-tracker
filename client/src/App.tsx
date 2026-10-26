import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { InventoryActionsProvider } from './components/InventoryActions';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { MovementsPage } from './pages/MovementsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <InventoryActionsProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/movements" element={<MovementsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </InventoryActionsProvider>
  );
}
