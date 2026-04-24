import type {
  AddonInstallResult,
  ExtensionSourceInput,
  ExtensionSourceInstallResult,
  ExtensionSourceSyncResult,
  ModInstallResult,
} from '../../shared/types';

type ExtensionLifecycleActionsArgs = {
  installExtensionSource: (input: ExtensionSourceInput) => Promise<ExtensionSourceInstallResult>;
  updateExtensionSource: (sourceId: string, input: ExtensionSourceInput) => Promise<ExtensionSourceInstallResult>;
  removeExtensionSource: (id: string) => Promise<boolean>;
  toggleExtensionSource: (id: string, enabled: boolean) => Promise<boolean>;
  syncExtensionSource: (id: string) => Promise<ExtensionSourceSyncResult>;
  refreshSources: () => Promise<void>;
  installAddon: () => Promise<AddonInstallResult>;
  removeAddon: (id: string) => Promise<boolean>;
  toggleAddon: (id: string, enabled: boolean) => Promise<boolean>;
  refreshAddons: () => Promise<void>;
  installMod: () => Promise<ModInstallResult>;
  removeMod: (id: string) => Promise<boolean>;
  toggleMod: (id: string, enabled: boolean) => Promise<boolean>;
  refreshMods: () => Promise<void>;
};

export function createExtensionLifecycleActions({
  installExtensionSource,
  updateExtensionSource,
  removeExtensionSource,
  toggleExtensionSource,
  syncExtensionSource,
  refreshSources,
  installAddon,
  removeAddon,
  toggleAddon,
  refreshAddons,
  installMod,
  removeMod,
  toggleMod,
  refreshMods,
}: ExtensionLifecycleActionsArgs) {
  const installSourceAndRefresh = async (input: ExtensionSourceInput): Promise<ExtensionSourceInstallResult> => {
    const result = await installExtensionSource(input);
    if (result.ok) await refreshSources();
    return result;
  };

  const updateSourceAndRefresh = async (
    sourceId: string,
    input: ExtensionSourceInput,
  ): Promise<ExtensionSourceInstallResult> => {
    const result = await updateExtensionSource(sourceId, input);
    if (result.ok) await refreshSources();
    return result;
  };

  const removeSourceAndRefresh = async (id: string): Promise<boolean> => {
    const ok = await removeExtensionSource(id);
    if (ok) await refreshSources();
    return ok;
  };

  const toggleSourceAndRefresh = async (id: string, enabled: boolean): Promise<boolean> => {
    const ok = await toggleExtensionSource(id, enabled);
    if (ok) await refreshSources();
    return ok;
  };

  const syncSourceAndRefresh = async (id: string): Promise<ExtensionSourceSyncResult> => {
    const result = await syncExtensionSource(id);
    await refreshSources();
    return result;
  };

  const installAddonAndRefresh = async (): Promise<AddonInstallResult> => {
    const result = await installAddon();
    if (result.ok) await refreshAddons();
    return result;
  };

  const removeAddonAndRefresh = async (id: string): Promise<boolean> => {
    const ok = await removeAddon(id);
    if (ok) await refreshAddons();
    return ok;
  };

  const toggleAddonAndRefresh = async (id: string, enabled: boolean): Promise<boolean> => {
    const ok = await toggleAddon(id, enabled);
    if (ok) await refreshAddons();
    return ok;
  };

  const installModAndRefresh = async (): Promise<ModInstallResult> => {
    const result = await installMod();
    if (result.ok) await refreshMods();
    return result;
  };

  const removeModAndRefresh = async (id: string): Promise<boolean> => {
    const ok = await removeMod(id);
    if (ok) await refreshMods();
    return ok;
  };

  const toggleModAndRefresh = async (id: string, enabled: boolean): Promise<boolean> => {
    const ok = await toggleMod(id, enabled);
    if (ok) await refreshMods();
    return ok;
  };

  return {
    installExtensionSource: installSourceAndRefresh,
    updateExtensionSource: updateSourceAndRefresh,
    removeExtensionSource: removeSourceAndRefresh,
    toggleExtensionSource: toggleSourceAndRefresh,
    syncExtensionSource: syncSourceAndRefresh,
    installAddon: installAddonAndRefresh,
    removeAddon: removeAddonAndRefresh,
    toggleAddon: toggleAddonAndRefresh,
    installMod: installModAndRefresh,
    removeMod: removeModAndRefresh,
    toggleMod: toggleModAndRefresh,
  };
}
