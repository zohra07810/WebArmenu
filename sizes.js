// sizesLogic.js
export async function loadSizesMarker(markerEntity, contentDiv, markerMenu) {
  let currentModel = null;
  const preloadedModels = {};

  function showModelDescription(modelData, variantName, categoryName) {
    const oldDesc = document.getElementById('model-desc-container');
    if (oldDesc) oldDesc.remove();

    const container = document.createElement('div');
    container.id = 'model-desc-container';

    const desc = document.createElement('p');
    desc.textContent = modelData.description || `Viewing ${variantName} from ${categoryName}`;
    container.appendChild(desc);

    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back';
    backBtn.onclick = () => showVariants(categoryName);
    container.appendChild(backBtn);

    contentDiv.appendChild(container);
  }

  function showMainCategories() {
    contentDiv.innerHTML = '<h3>Select Category:</h3>';
    const categories = markerMenu[markerEntity.dataset.index].categories;

    Object.keys(categories).forEach(categoryName => {
      const btn = document.createElement('button');
      btn.textContent = categoryName;
      btn.onclick = () => showVariants(categoryName);
      contentDiv.appendChild(btn);
    });
  }

  function showVariants(categoryName) {
    contentDiv.innerHTML = `<h3>${categoryName}</h3>`;
    const variants = markerMenu[markerEntity.dataset.index].categories[categoryName].variants;

    Object.keys(variants).forEach(variantName => {
      const btn = document.createElement('button');
      btn.textContent = variantName;
      btn.onclick = () => loadModel(variants[variantName], categoryName, variantName);
      contentDiv.appendChild(btn);
    });

    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back';
    backBtn.onclick = showMainCategories;
    contentDiv.appendChild(backBtn);
  }

  function loadModel(modelData, categoryName, variantName) {
    const markerKey = markerEntity.dataset.id || `marker${markerEntity.dataset.index}`;
    const modelKey = `${markerKey}_${categoryName}_${variantName}`;

    // Hide other models
    Object.keys(preloadedModels).forEach(key => {
      preloadedModels[key].object3D.visible = false;
    });

    contentDiv.innerHTML = '';

    // Show cached model if available
    if (preloadedModels[modelKey]) {
      preloadedModels[modelKey].object3D.visible = true;
      currentModel = preloadedModels[modelKey];
      showModelDescription(modelData, variantName, categoryName);
      addChangeViewButton();
      preloadOtherVariants(categoryName, variantName);
      return;
    }

    // Loading bar for current model
    const progressContainer = document.createElement('div');
    progressContainer.style.width = '100%';
    progressContainer.style.height = '20px';
    progressContainer.style.border = '1px solid #333';
    progressContainer.style.marginBottom = '10px';

    const progressBar = document.createElement('div');
    progressBar.style.width = '0%';
    progressBar.style.height = '100%';
    progressBar.style.backgroundColor = '#4caf50';
    progressContainer.appendChild(progressBar);
    contentDiv.appendChild(progressContainer);
    contentDiv.appendChild(document.createTextNode('Loading 3D model...'));

    const entity = document.createElement('a-entity');
    entity.setAttribute('scale', modelData.scale || '0.2 0.2 0.2');
    entity.setAttribute('position', modelData.position || '0 0 0');
    entity.object3D.visible = false;
    markerEntity.appendChild(entity);

    const loader = new THREE.GLTFLoader();
    if (THREE.DRACOLoader) {
      const draco = new THREE.DRACOLoader();
      draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      loader.setDRACOLoader(draco);
    }

    loader.load(
      modelData.path,
      gltf => {
        entity.setObject3D('mesh', gltf.scene);
        entity.object3D.visible = true;
        preloadedModels[modelKey] = entity;
        currentModel = entity;
        contentDiv.innerHTML = '';
        showModelDescription(modelData, variantName, categoryName);
        addChangeViewButton();

         setTimeout(() => {
  const visibleModels = Object.values(preloadedModels).filter(
    (m) => m.object3D.visible
  );

  if (!currentModel || !currentModel.object3D.visible || visibleModels.length > 1) {
    // Create overlay div
    let overlay = document.createElement('div');
    overlay.id = 'refresh-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
    overlay.style.color = 'white';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.fontSize = '24px';
    overlay.style.zIndex = '9999';
    overlay.textContent = "There's something wrong, we will refresh...";

    document.body.appendChild(overlay);

    // Wait 3 seconds, then refresh
    setTimeout(() => location.reload(), 3000);
  }
}, 3000);

        // Preload other variants silently
        preloadOtherVariants(categoryName, variantName);
      },
      xhr => {
        if (xhr.total) progressBar.style.width = (xhr.loaded / xhr.total) * 100 + '%';
      },
      err => {
        console.error('Failed to load model', err);
        contentDiv.innerHTML = 'Failed to load 3D model';
      }
    );
  }

  function preloadOtherVariants(categoryName, activeVariantName) {
    const variants = markerMenu[markerEntity.dataset.index].categories[categoryName].variants;
    const loader = new THREE.GLTFLoader();
    if (THREE.DRACOLoader) {
      const draco = new THREE.DRACOLoader();
      draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      loader.setDRACOLoader(draco);
    }

    Object.keys(variants).forEach(vName => {
      if (vName !== activeVariantName) {
        const key = `${markerEntity.dataset.id || `marker${markerEntity.dataset.index}`}_${categoryName}_${vName}`;
        if (!preloadedModels[key]) {
          const vData = variants[vName];
          const e = document.createElement('a-entity');
          e.setAttribute('scale', vData.scale || '0.2 0.2 0.2');
          e.setAttribute('position', vData.position || '0 0 0');
          e.object3D.visible = false;
          markerEntity.appendChild(e);

          loader.load(
            vData.path,
            gltf => { e.setObject3D('mesh', gltf.scene); preloadedModels[key] = e; },
            undefined,
            err => console.warn(`Failed to preload ${key}`, err)
          );
        }
      }
    });
  }

  function addChangeViewButton() {
    if (!currentModel) return;
    const container = document.getElementById('change-view-container');
    if (!container) return;
    container.innerHTML = '';

    const viewBtn = document.createElement('button');
    viewBtn.textContent = 'Change View';
    viewBtn.style.padding = '8px 12px';
    viewBtn.style.fontSize = '16px';
    viewBtn.style.backgroundColor = '#FFD700';
    viewBtn.style.color = '#000';
    viewBtn.style.border = 'none';
    viewBtn.style.borderRadius = '5px';
    viewBtn.style.cursor = 'pointer';

    const originalPos = currentModel.getAttribute('position') || {x:0,y:0,z:0};
    const views = [
    { rotation: { x: 0, y: 0, z: 0 }, position: { x: originalPos.x, y: originalPos.y, z: originalPos.z } },
    { rotation: { x: -80, y: 0, z: 0 }, position: { x: originalPos.x, y: originalPos.y + 1, z: originalPos.z } },
    { rotation: { x: -50, y: 0, z: 0 }, position: { x: originalPos.x, y: originalPos.y + 1, z: originalPos.z } },
    { rotation: { x: 0, y: 0, z: 90 }, position: { x: originalPos.x, y: originalPos.y + 1, z: originalPos.z } },
    { rotation: { x: 0, y: 0, z: 180 }, position: { x: originalPos.x, y: originalPos.y + 1, z: originalPos.z } },
    ];
    let currentViewIndex = 0;

    viewBtn.onclick = () => {
      currentViewIndex = (currentViewIndex + 1) % views.length;
      const view = views[currentViewIndex];
      currentModel.setAttribute('rotation', view.rotation);
      currentModel.setAttribute('position', view.position);
    };

    container.appendChild(viewBtn);
  }

  // Start
  showMainCategories();

  return { loadModel, showMainCategories, showVariants };
}

