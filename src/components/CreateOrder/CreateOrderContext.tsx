import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SavedOrder } from '@/lib/create-order-api';
import { savedOrderToEditState } from './order-utils';
import { useOrderCatalog } from './OrderCatalogContext';
import {
  type CreateOrderState,
  type FinancialDetails,
  type ProductBundle,
  type School,
  type SelectedProduct,
  computeFinancials,
  emptyFinancial,
} from './types';

type CreateOrderContextValue = {
  state: CreateOrderState;
  editingOrderId: string | null;
  editingOrderNumber: string | null;
  isEditMode: boolean;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  goToStep: (step: number) => void;
  selectSchool: (school: School | null) => void;
  setSelectedProducts: (products: SelectedProduct[]) => void;
  addProduct: (product: SelectedProduct) => void;
  updateProductQty: (id: string, qty: number) => void;
  updateProduct: (
    id: string,
    patch: Partial<Pick<SelectedProduct, 'name' | 'classLabel' | 'price' | 'qty'>>,
  ) => void;
  updateProductComp: (id: string, comp: number) => void;
  removeProduct: (id: string) => void;
  catalogBundles: ProductBundle[];
  catalogLoading: boolean;
  reloadCatalog: () => Promise<void>;
  updateCatalogBundle: (
    id: string,
    patch: Partial<Pick<ProductBundle, 'name' | 'classLabel' | 'price'>>,
  ) => Promise<{ success: boolean; message?: string }>;
  removeCatalogBundle: (id: string) => Promise<{ success: boolean; message?: string }>;
  addCatalogBundle: (
    bundle: ProductBundle & { isCustom?: boolean },
  ) => Promise<{ success: boolean; message?: string }>;
  updateFinancial: (patch: Partial<FinancialDetails>) => void;
  resetOrder: () => void;
  maxReachableStep: number;
  showStep3Errors: boolean;
  triggerStep3Validation: () => void;
};

const CreateOrderContext = createContext<CreateOrderContextValue | null>(null);

function buildInitialFromOrder(order?: SavedOrder | null) {
  if (!order) {
    return {
      editingOrderId: null as string | null,
      editingOrderNumber: null as string | null,
      selectedSchool: null as School | null,
      selectedProducts: [] as SelectedProduct[],
      financial: emptyFinancial(),
      currentStep: 1,
    };
  }
  const { selectedSchool, selectedProducts, financial } = savedOrderToEditState(order);
  return {
    editingOrderId: order.id || String((order as SavedOrder & { _id?: string })._id || ''),
    editingOrderNumber: order.orderNumber,
    selectedSchool,
    selectedProducts,
    financial,
    currentStep: 1,
  };
}

export function CreateOrderProvider({
  children,
  initialOrder,
}: {
  children: ReactNode;
  initialOrder?: SavedOrder | null;
}) {
  const init = buildInitialFromOrder(initialOrder);
  const [currentStep, setCurrentStep] = useState(init.currentStep);
  const [editingOrderId] = useState(init.editingOrderId);
  const [editingOrderNumber] = useState(init.editingOrderNumber);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(init.selectedSchool);
  const [selectedProducts, setSelectedProductsState] = useState<SelectedProduct[]>(
    init.selectedProducts,
  );
  const [financial, setFinancial] = useState<FinancialDetails>(init.financial);
  const [showStep3Errors, setShowStep3Errors] = useState(false);

  const {
    catalogBundles,
    catalogLoading,
    reloadCatalog,
    updateCatalogBundle: updateCatalogInStore,
    removeCatalogBundle: removeCatalogInStore,
    addCatalogBundle,
  } = useOrderCatalog();

  const computed = useMemo(
    () =>
      computeFinancials(
        selectedProducts,
        financial.itemDiscount,
        financial.specialDiscount,
        financial.advanceReceived,
      ),
    [
      selectedProducts,
      financial.itemDiscount,
      financial.specialDiscount,
      financial.advanceReceived,
    ],
  );

  const state: CreateOrderState = useMemo(
    () => ({ selectedSchool, selectedProducts, financial, computed }),
    [selectedSchool, selectedProducts, financial, computed],
  );

  const maxReachableStep = useMemo(() => {
    if (!selectedSchool) return 1;
    if (selectedProducts.length === 0) return 2;
    return 4;
  }, [selectedSchool, selectedProducts.length]);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 1 && step <= maxReachableStep) {
        setCurrentStep(step);
      }
    },
    [maxReachableStep],
  );

  const selectSchool = useCallback((school: School | null) => {
    setSelectedSchool(school);
  }, []);

  const setSelectedProducts = useCallback((products: SelectedProduct[]) => {
    setSelectedProductsState(products);
  }, []);

  const addProduct = useCallback((product: SelectedProduct) => {
    setSelectedProductsState((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, qty: p.qty + 1 } : p,
        );
      }
      return [...prev, { ...product, qty: 1, comp: 0 }];
    });
  }, []);

  const updateProductQty = useCallback((id: string, qty: number) => {
    if (qty < 1) {
      setSelectedProductsState((prev) => prev.filter((p) => p.id !== id));
      return;
    }
    setSelectedProductsState((prev) =>
      prev.map((p) => (p.id === id ? { ...p, qty } : p)),
    );
  }, []);

  const updateProduct = useCallback(
    (
      id: string,
      patch: Partial<Pick<SelectedProduct, 'name' | 'classLabel' | 'price' | 'qty'>>,
    ) => {
      setSelectedProductsState((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const next = { ...p, ...patch };
          if (patch.qty !== undefined && patch.qty < 1) return p;
          if (patch.price !== undefined) next.price = Math.max(0, patch.price);
          if (patch.qty !== undefined) next.qty = Math.max(1, patch.qty);
          return next;
        }),
      );
    },
    [],
  );

  const updateProductComp = useCallback((id: string, comp: number) => {
    setSelectedProductsState((prev) =>
      prev.map((p) => (p.id === id ? { ...p, comp: Math.max(0, comp) } : p)),
    );
  }, []);

  const removeProduct = useCallback((id: string) => {
    setSelectedProductsState((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updateCatalogBundle = useCallback(
    async (id: string, patch: Partial<Pick<ProductBundle, 'name' | 'classLabel' | 'price'>>) => {
      const result = await updateCatalogInStore(id, patch);
      if (result.success) {
        setSelectedProductsState((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        );
      }
      return result;
    },
    [updateCatalogInStore],
  );

  const removeCatalogBundle = useCallback(
    async (id: string) => {
      const result = await removeCatalogInStore(id);
      if (result.success) {
        setSelectedProductsState((prev) => prev.filter((p) => p.id !== id));
      }
      return result;
    },
    [removeCatalogInStore],
  );

  const updateFinancial = useCallback((patch: Partial<FinancialDetails>) => {
    setFinancial((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetOrder = useCallback(() => {
    setCurrentStep(1);
    setSelectedSchool(null);
    setSelectedProductsState([]);
    setFinancial(emptyFinancial());
    setShowStep3Errors(false);
  }, []);

  const triggerStep3Validation = useCallback(() => {
    setShowStep3Errors(true);
  }, []);

  const value: CreateOrderContextValue = {
    state,
    editingOrderId,
    editingOrderNumber,
    isEditMode: Boolean(editingOrderId),
    currentStep,
    setCurrentStep,
    goToStep,
    selectSchool,
    setSelectedProducts,
    addProduct,
    updateProductQty,
    updateProduct,
    updateProductComp,
    removeProduct,
    catalogBundles,
    catalogLoading,
    reloadCatalog,
    updateCatalogBundle,
    removeCatalogBundle,
    addCatalogBundle,
    updateFinancial,
    resetOrder,
    maxReachableStep,
    showStep3Errors,
    triggerStep3Validation,
  };

  return (
    <CreateOrderContext.Provider value={value}>{children}</CreateOrderContext.Provider>
  );
}

export function useCreateOrder() {
  const ctx = useContext(CreateOrderContext);
  if (!ctx) {
    throw new Error('useCreateOrder must be used within CreateOrderProvider');
  }
  return ctx;
}
