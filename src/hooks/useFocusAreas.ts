import { useState, useEffect, useCallback } from 'react';
import { FocusArea, FocusAreaType, FocusAreaStatus, NewFocusArea } from '../db/schema';
import { focusAreaQueries } from '../db/queries';

/**
 * Hook for accessing focus areas with various filters
 */
export function useFocusAreas(options?: {
  filter?: 'all' | 'active' | 'root' | 'trackable' | 'areas';
  type?: FocusAreaType;
  parentId?: number;
}) {
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let result: FocusArea[];

      if (options?.parentId) {
        result = await focusAreaQueries.getActiveChildren(options.parentId);
      } else if (options?.type) {
        result = await focusAreaQueries.getByType(options.type);
      } else {
        switch (options?.filter) {
          case 'active':
            result = await focusAreaQueries.getAllActive();
            break;
          case 'root':
            result = await focusAreaQueries.getRootActive();
            break;
          case 'trackable':
            result = await focusAreaQueries.getTrackable();
            break;
          case 'areas':
            result = await focusAreaQueries.getAreas();
            break;
          case 'all':
          default:
            result = await focusAreaQueries.getAll();
        }
      }

      setFocusAreas(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load focus areas';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [options?.filter, options?.type, options?.parentId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    focusAreas,
    isLoading,
    error,
    refresh: load,
  };
}

/**
 * Hook for a single focus area
 */
export function useFocusArea(id: number) {
  const [focusArea, setFocusArea] = useState<FocusArea | null>(null);
  const [children, setChildren] = useState<FocusArea[]>([]);
  const [parent, setParent] = useState<FocusArea | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const fa = await focusAreaQueries.getById(id);
      setFocusArea(fa || null);

      if (fa) {
        // Load children if this is an Area
        if (fa.type === 'AREA') {
          const childList = await focusAreaQueries.getChildren(id);
          setChildren(childList);
        }

        // Load parent if this has one
        if (fa.parentFocusAreaId) {
          const parentFa = await focusAreaQueries.getById(fa.parentFocusAreaId);
          setParent(parentFa || null);
        }
      }
    } catch (e) {
      console.error('Error loading focus area:', e);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    focusArea,
    children,
    parent,
    isLoading,
    refresh: load,
  };
}

/**
 * Hook for focus area mutations
 */
export function useFocusAreaMutations() {
  const create = async (data: NewFocusArea) => {
    return focusAreaQueries.create(data);
  };

  const update = async (id: number, data: Partial<NewFocusArea>) => {
    return focusAreaQueries.update(id, data);
  };

  const updateStatus = async (
    id: number,
    status: FocusAreaStatus,
    reflection?: { completion?: string; abandonment?: string }
  ) => {
    return focusAreaQueries.updateStatus(id, status, reflection);
  };

  const assignToParent = async (id: number, parentId: number | null) => {
    return focusAreaQueries.assignToParent(id, parentId);
  };

  const archive = async (id: number) => {
    return focusAreaQueries.archive(id);
  };

  const remove = async (id: number) => {
    return focusAreaQueries.delete(id);
  };

  return {
    create,
    update,
    updateStatus,
    assignToParent,
    archive,
    remove,
  };
}

/**
 * Hook for potential parents (only AREA types)
 */
export function usePotentialParents(excludeId?: number) {
  const [parents, setParents] = useState<FocusArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await focusAreaQueries.getPotentialParents(excludeId);
        setParents(result);
      } catch (e) {
        console.error('Error loading potential parents:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [excludeId]);

  return { parents, isLoading };
}

export default useFocusAreas;
