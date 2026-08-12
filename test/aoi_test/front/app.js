"use strict";

(function initializeAoiTest() {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const REQUEST_DEBOUNCE_MS = 40;

    /**
     * 集中缓存 DOM 引用。初始化阶段就暴露缺失节点，比在交互过程中偶发
     * null 异常更容易定位 HTML 与脚本不一致的问题。
     */
    const view = Object.freeze({
        map: required("world-map"),
        mapBackground: required("map-background"),
        mapGrid: required("map-grid"),
        xAxis: required("x-axis"),
        zAxis: required("z-axis"),
        shapeLayer: required("shape-layer"),
        entityLayer: required("entity-layer"),
        overviewMap: required("overview-map"),
        overviewBackground: required("overview-background"),
        overviewXAxis: required("overview-x-axis"),
        overviewZAxis: required("overview-z-axis"),
        overviewEntityLayer: required("overview-entity-layer"),
        cameraViewport: required("camera-viewport"),
        connection: required("connection-status"),
        interestCount: required("interest-count"),
        policyCount: required("policy-count"),
        shapeCount: required("shape-count"),
        selectedGuid: required("selected-guid"),
        removeTarget: required("remove-target"),
        requestError: required("request-error"),
        diagnostics: required("diagnostics"),
        transition: required("transition"),
        interestList: required("interest-list"),
        policyList: required("policy-list"),
        shapeList: required("shape-list"),
    });

    const controls = Object.freeze({
        shape: required("shape"),
        radius: required("radius"),
        halfX: required("half-x"),
        halfY: required("half-y"),
        extentHalfY: required("extent-half-y"),
        halfZ: required("half-z"),
        yaw: required("yaw"),
        halfAngle: required("half-angle"),
        maxInterest: required("max-interest"),
        heightEnabled: required("height-enabled"),
        minHeight: required("min-height"),
        maxHeight: required("max-height"),
        anyFlags: required("any-flags"),
        needFlags: required("need-flags"),
        forbidFlags: required("forbid-flags"),
        backend: required("backend"),
        gridSize: required("grid-size"),
        mapExtent: required("map-extent"),
        entityX: required("entity-x"),
        entityY: required("entity-y"),
        entityZ: required("entity-z"),
        entityFlags: required("entity-flags"),
        radiusFields: required("radius-fields"),
        extentFields: required("extent-fields"),
        fanFields: required("fan-fields"),
        halfHeightField: required("half-height-field"),
        heightFields: required("height-fields"),
    });

    let state = createDefaultScenario();
    let selectedGuid = state.observer.guid;
    let result = emptyResult();
    let previousInterestGuids = null;
    let draggedGuid = null;
    let requestTimer = null;
    let requestSequence = 0;
    let activeRequest = null;

    function required(id) {
        const element = document.getElementById(id);

        if (!element) throw new Error(`缺少页面节点 #${id}`);
        return element;
    }

    function createDefaultScenario() {
        return {
            backend: "grid",
            gridSize: 20,
            mapExtent: 100,
            observer: { guid: "observer", x: 0, y: 0, z: 0, flags: 1 },
            targets: [
                { guid: "target-1", x: 22, y: 0, z: 8, flags: 1 },
                { guid: "target-2", x: -36, y: 0, z: -18, flags: 1 },
                { guid: "target-3", x: 48, y: 8, z: 34, flags: 3 },
                { guid: "target-4", x: -12, y: 18, z: 42, flags: 2 },
                { guid: "target-5", x: 72, y: 0, z: -52, flags: 1 },
            ],
            policy: {
                shape: "circle",
                radius: 50,
                halfExtentX: 50,
                halfExtentY: 10,
                halfExtentZ: 30,
                yaw: 0,
                halfAngle: Math.PI / 4,
                heightEnabled: false,
                minHeight: -10,
                maxHeight: 10,
                anyFlags: 1,
                needFlags: 0,
                forbidFlags: 0,
                maxInterest: 20,
            },
        };
    }

    function emptyResult() {
        return {
            interestGuids: [],
            policyMatchedGuids: [],
            shapeQueryGuids: [],
            diagnostics: [],
            queryBounds: null,
        };
    }

    function clamp(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, value));
    }

    /**
     * 在当前地图单轴范围 [-mapExtent, mapExtent] 内生成一位小数坐标。
     * X 和 Z 分别调用，因此新目标可以覆盖整张 XZ 地图，而不是集中出现
     * 在某条固定递增轨迹上。
     */
    function randomMapCoordinate() {
        const coordinate = (
            Math.random() * state.mapExtent * 2
            - state.mapExtent
        );

        return Math.round(coordinate * 10) / 10;
    }

    function numeric(control) {
        return Number(control.value);
    }

    function entityByGuid(guid) {
        return guid === state.observer.guid
            ? state.observer
            : state.targets.find((target) => target.guid === guid) || null;
    }

    function setConnection(status, message) {
        view.connection.dataset.state = status;
        view.connection.value = message;
        view.connection.textContent = message;
    }

    /** 将内存场景完整投影到表单，供初始化和重置复用。 */
    function writeControls() {
        controls.shape.value = state.policy.shape;
        controls.radius.value = state.policy.radius;
        controls.halfX.value = state.policy.halfExtentX;
        controls.halfY.value = state.policy.halfExtentY;
        controls.extentHalfY.value = state.policy.halfExtentY;
        controls.halfZ.value = state.policy.halfExtentZ;
        controls.yaw.value = radiansToDegrees(state.policy.yaw);
        controls.halfAngle.value = radiansToDegrees(state.policy.halfAngle);
        controls.maxInterest.value = state.policy.maxInterest;
        controls.heightEnabled.checked = state.policy.heightEnabled;
        controls.minHeight.value = state.policy.minHeight;
        controls.maxHeight.value = state.policy.maxHeight;
        controls.anyFlags.value = state.policy.anyFlags;
        controls.needFlags.value = state.policy.needFlags;
        controls.forbidFlags.value = state.policy.forbidFlags;
        controls.backend.value = state.backend;
        controls.gridSize.value = state.gridSize;
        controls.mapExtent.value = state.mapExtent;
        updateMapBounds();
        updateConditionalControls();
        writeSelectedEntityControls();
    }

    /** 只读取 Policy/Backend 表单，不读取当前实体位置表单。 */
    function readPolicyControls() {
        state.policy.shape = controls.shape.value;
        state.policy.radius = numeric(controls.radius);
        state.policy.halfExtentX = numeric(controls.halfX);
        state.policy.halfExtentY = state.policy.shape === "cylinder"
            ? numeric(controls.halfY)
            : numeric(controls.extentHalfY);
        state.policy.halfExtentZ = numeric(controls.halfZ);
        state.policy.yaw = degreesToRadians(numeric(controls.yaw));
        state.policy.halfAngle = degreesToRadians(numeric(controls.halfAngle));
        state.policy.maxInterest = numeric(controls.maxInterest);
        state.policy.heightEnabled = controls.heightEnabled.checked;
        state.policy.minHeight = numeric(controls.minHeight);
        state.policy.maxHeight = numeric(controls.maxHeight);
        state.policy.anyFlags = numeric(controls.anyFlags);
        state.policy.needFlags = numeric(controls.needFlags);
        state.policy.forbidFlags = numeric(controls.forbidFlags);
        state.backend = controls.backend.value;
        state.gridSize = numeric(controls.gridSize);
        const nextMapExtent = numeric(controls.mapExtent);

        if (
            Number.isFinite(nextMapExtent)
            && nextMapExtent >= 10
            && nextMapExtent <= 100000
        ) {
            state.mapExtent = nextMapExtent;
        }

        updateMapBounds();
        updateConditionalControls();
    }

    function updateConditionalControls() {
        const shape = state.policy.shape;
        const usesRadius = ["circle", "fan", "cylinder"].includes(shape);
        controls.radiusFields.hidden = !usesRadius;
        controls.halfHeightField.hidden = shape !== "cylinder";
        controls.extentFields.hidden = !["rectangle", "cuboid"].includes(shape);
        controls.extentHalfY.parentElement.hidden = shape !== "cuboid";
        controls.fanFields.hidden = shape !== "fan";
        controls.heightFields.hidden = !state.policy.heightEnabled;
        controls.gridSize.disabled = state.backend !== "grid";
    }

    function writeSelectedEntityControls() {
        const selected = entityByGuid(selectedGuid) || state.observer;
        selectedGuid = selected.guid;
        view.selectedGuid.textContent = selected.guid;
        view.removeTarget.hidden = selected.guid === state.observer.guid;
        controls.entityX.value = selected.x;
        controls.entityY.value = selected.y;
        controls.entityZ.value = selected.z;
        controls.entityFlags.value = selected.flags;
    }

    function readSelectedEntityControls() {
        const selected = entityByGuid(selectedGuid);
        if (!selected) return;

        selected.x = clamp(numeric(controls.entityX), -state.mapExtent, state.mapExtent);
        selected.y = numeric(controls.entityY);
        selected.z = clamp(numeric(controls.entityZ), -state.mapExtent, state.mapExtent);
        selected.flags = numeric(controls.entityFlags);
        controls.entityX.value = selected.x;
        controls.entityZ.value = selected.z;
    }

    function degreesToRadians(value) {
        return value * Math.PI / 180;
    }

    function radiansToDegrees(value) {
        return Math.round(value * 180 / Math.PI * 1000) / 1000;
    }

    /**
     * 地图使用以原点为中心的正方形 X/Z 范围。修改尺寸时同步更新 SVG
     * viewBox 和坐标输入边界；已有实体会被裁剪回新范围，避免服务端因实体
     * 位于新的 WorldBounds 外而拒绝整个场景。
     */
    function updateMapBounds() {
        const extent = state.mapExtent;
        view.mapBackground.setAttribute("x", String(-extent));
        view.mapBackground.setAttribute("y", String(-extent));
        view.mapBackground.setAttribute("width", String(extent * 2));
        view.mapBackground.setAttribute("height", String(extent * 2));
        view.mapGrid.setAttribute("x", String(-extent));
        view.mapGrid.setAttribute("y", String(-extent));
        view.mapGrid.setAttribute("width", String(extent * 2));
        view.mapGrid.setAttribute("height", String(extent * 2));
        view.xAxis.setAttribute("x1", String(-extent));
        view.xAxis.setAttribute("x2", String(extent));
        view.zAxis.setAttribute("y1", String(-extent));
        view.zAxis.setAttribute("y2", String(extent));
        view.overviewMap.setAttribute(
            "viewBox",
            `${-extent} ${-extent} ${extent * 2} ${extent * 2}`
        );
        view.overviewBackground.setAttribute("x", String(-extent));
        view.overviewBackground.setAttribute("y", String(-extent));
        view.overviewBackground.setAttribute("width", String(extent * 2));
        view.overviewBackground.setAttribute("height", String(extent * 2));
        view.overviewXAxis.setAttribute("x1", String(-extent));
        view.overviewXAxis.setAttribute("x2", String(extent));
        view.overviewZAxis.setAttribute("y1", String(-extent));
        view.overviewZAxis.setAttribute("y2", String(extent));

        for (const control of [controls.entityX, controls.entityZ]) {
            control.min = String(-extent);
            control.max = String(extent);
        }

        for (const entity of [state.observer, ...state.targets]) {
            entity.x = clamp(entity.x, -extent, extent);
            entity.z = clamp(entity.z, -extent, extent);
        }

        writeSelectedEntityControls();
        updateCamera();
    }

    /** 返回当前 Shape 在 X/Z 方向上的最大半尺寸。 */
    function shapeHalfExtentXZ() {
        if (["circle", "fan", "cylinder"].includes(state.policy.shape)) {
            return state.policy.radius;
        }

        return Math.max(
            state.policy.halfExtentX,
            state.policy.halfExtentZ
        );
    }

    /**
     * 主摄像机跟随观察者，并显示 Shape 最大半尺寸三倍的正方形区域。
     * 最小半尺寸保证半径为 0 时仍可操作；最大不超过整张地图半尺寸。
     */
    function cameraHalfExtent() {
        return Math.min(
            state.mapExtent,
            Math.max(5, shapeHalfExtentXZ() * 3)
        );
    }

    function updateCamera() {
        const observer = state.observer;
        const extent = cameraHalfExtent();
        view.map.setAttribute(
            "viewBox",
            `${observer.x - extent} ${observer.z - extent} ${extent * 2} ${extent * 2}`
        );
        view.map.style.setProperty(
            "--entity-label-size",
            `${Math.max(.8, extent * .032)}px`
        );
        view.cameraViewport.setAttribute("x", String(observer.x - extent));
        view.cameraViewport.setAttribute("y", String(observer.z - extent));
        view.cameraViewport.setAttribute("width", String(extent * 2));
        view.cameraViewport.setAttribute("height", String(extent * 2));
    }

    function svg(name, attributes = {}) {
        const element = document.createElementNS(SVG_NS, name);

        for (const [attribute, value] of Object.entries(attributes)) {
            element.setAttribute(attribute, String(value));
        }

        return element;
    }

    /**
     * 浏览器只绘制场景配置，不进行 contains 判断。颜色完全来自服务端返回
     * 的 src/aoi 结果，从而避免前端算法掩盖被测实现中的问题。
     */
    function renderShape() {
        view.shapeLayer.replaceChildren();
        const observer = state.observer;
        const policy = state.policy;
        let shapeElement;

        if (["circle", "cylinder"].includes(policy.shape)) {
            shapeElement = svg("circle", {
                cx: observer.x,
                cy: observer.z,
                r: Math.max(0, policy.radius),
                class: "vision",
            });
        } else if (["rectangle", "cuboid"].includes(policy.shape)) {
            shapeElement = svg("rect", {
                x: observer.x - policy.halfExtentX,
                y: observer.z - policy.halfExtentZ,
                width: policy.halfExtentX * 2,
                height: policy.halfExtentZ * 2,
                class: "vision",
            });
        } else {
            const start = policy.yaw - policy.halfAngle;
            const end = policy.yaw + policy.halfAngle;
            const startX = observer.x + Math.cos(start) * policy.radius;
            const startZ = observer.z + Math.sin(start) * policy.radius;
            const endX = observer.x + Math.cos(end) * policy.radius;
            const endZ = observer.z + Math.sin(end) * policy.radius;
            const largeArc = policy.halfAngle * 2 > Math.PI ? 1 : 0;
            shapeElement = svg("path", {
                d: `M ${observer.x} ${observer.z} L ${startX} ${startZ} A ${policy.radius} ${policy.radius} 0 ${largeArc} 1 ${endX} ${endZ} Z`,
                class: "vision",
            });
        }

        view.shapeLayer.append(shapeElement);

        if (result.queryBounds) {
            view.shapeLayer.append(svg("rect", {
                x: result.queryBounds.minX,
                y: result.queryBounds.minZ,
                width: result.queryBounds.maxX - result.queryBounds.minX,
                height: result.queryBounds.maxZ - result.queryBounds.minZ,
                class: "query-bounds",
            }));
        }
    }

    function renderEntities() {
        view.entityLayer.replaceChildren();
        const interested = new Set(result.interestGuids);
        const policyMatched = new Set(result.policyMatchedGuids);
        const cameraExtent = cameraHalfExtent();
        const observerRadius = Math.max(.6, cameraExtent * .026);
        const targetRadius = Math.max(.5, cameraExtent * .021);
        const labelOffset = targetRadius * 1.6;

        for (const entity of [state.observer, ...state.targets]) {
            const isObserver = entity.guid === state.observer.guid;
            const className = isObserver
                ? "observer"
                : interested.has(entity.guid)
                    ? "interested"
                    : policyMatched.has(entity.guid) ? "matched" : "outside";
            const group = svg("g", {
                class: `entity ${className}${entity.guid === selectedGuid ? " selected" : ""}`,
                transform: `translate(${entity.x} ${entity.z})`,
                "data-guid": entity.guid,
                role: "button",
                "aria-label": `${entity.guid}，X ${entity.x}，Y ${entity.y}，Z ${entity.z}`,
            });
            const marker = svg("circle", {
                r: isObserver ? observerRadius : targetRadius,
            });
            const label = svg("text", {
                x: labelOffset,
                y: -labelOffset,
            });
            label.textContent = entity.guid;
            group.append(marker, label);
            view.entityLayer.append(group);
        }
    }

    /**
     * 绘制整张地图的缩略视图。缩略图只负责定位和选择，不承担拖拽，避免
     * 在很小的像素区域内误修改大范围世界坐标。
     */
    function renderOverview() {
        view.overviewEntityLayer.replaceChildren();
        const interested = new Set(result.interestGuids);
        const policyMatched = new Set(result.policyMatchedGuids);
        const markerRadius = Math.max(1, state.mapExtent * .014);

        for (const entity of [state.observer, ...state.targets]) {
            const isObserver = entity.guid === state.observer.guid;
            const className = isObserver
                ? "observer"
                : interested.has(entity.guid)
                    ? "interested"
                    : policyMatched.has(entity.guid) ? "matched" : "outside";
            const group = svg("g", {
                class: `overview-entity ${className}${entity.guid === selectedGuid ? " selected" : ""}`,
                transform: `translate(${entity.x} ${entity.z})`,
                "data-guid": entity.guid,
                role: "button",
                "aria-label": `在全局地图中选择 ${entity.guid}`,
            });
            group.append(svg("circle", {
                r: isObserver ? markerRadius * 1.25 : markerRadius,
            }));
            view.overviewEntityLayer.append(group);
        }
    }

    function renderResult() {
        view.interestCount.textContent = String(result.interestGuids.length);
        view.policyCount.textContent = String(result.policyMatchedGuids.length);
        view.shapeCount.textContent = String(result.shapeQueryGuids.length);
        view.interestList.textContent = listText(result.interestGuids);
        view.policyList.textContent = listText(result.policyMatchedGuids);
        view.shapeList.textContent = listText(result.shapeQueryGuids);
        view.diagnostics.hidden = result.diagnostics.length === 0;
        view.diagnostics.textContent = result.diagnostics.join("\n");
        renderTransition();
    }

    function listText(values) {
        return values.length === 0 ? "无" : values.join("、");
    }

    /** 只比较真实 Manager interest，Policy/Shape 辅助结果不生成 ENTER/LEAVE。 */
    function renderTransition() {
        const current = new Set(result.interestGuids);

        if (previousInterestGuids === null) {
            view.transition.textContent = `初始 interest：${current.size} 个目标`;
        } else {
            const entered = [...current].filter((guid) => !previousInterestGuids.has(guid));
            const left = [...previousInterestGuids].filter((guid) => !current.has(guid));
            const parts = [];
            if (entered.length) parts.push(`ENTER: ${entered.join(", ")}`);
            if (left.length) parts.push(`LEAVE: ${left.join(", ")}`);
            view.transition.textContent = parts.length ? parts.join("　") : "Interest 未变化";
        }

        previousInterestGuids = current;
    }

    function render() {
        updateCamera();
        renderShape();
        renderEntities();
        renderOverview();
        renderResult();
    }

    function renderMaps() {
        updateCamera();
        renderShape();
        renderEntities();
        renderOverview();
    }

    /**
     * 请求序号和 AbortController 共同防止快速拖动时旧响应覆盖新状态。
     * 即便浏览器无法及时取消已经到达服务端的请求，序号检查仍能丢弃过期响应。
     */
    async function evaluate() {
        const sequence = ++requestSequence;
        activeRequest?.abort();
        activeRequest = new AbortController();
        setConnection("loading", "正在计算");

        try {
            const response = await fetch("/api/evaluate", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(state),
                signal: activeRequest.signal,
            });
            const payload = await response.json();

            if (sequence !== requestSequence) return;
            if (!response.ok) throw new Error(payload.error || "AOI 计算失败");

            result = payload;
            view.requestError.hidden = true;
            setConnection("ready", "src/aoi 已响应");
            render();
        } catch (error) {
            if (error.name === "AbortError") return;
            view.requestError.hidden = false;
            view.requestError.textContent = error.message;
            setConnection("error", "执行失败");
        }
    }

    function scheduleEvaluation() {
        window.clearTimeout(requestTimer);
        requestTimer = window.setTimeout(evaluate, REQUEST_DEBOUNCE_MS);
    }

    function selectEntity(guid) {
        if (!entityByGuid(guid)) return;
        selectedGuid = guid;
        writeSelectedEntityControls();
        renderEntities();
        renderOverview();
    }

    /** 把浏览器像素坐标转换为 SVG viewBox 中的 X/Z 世界坐标。 */
    function eventToWorldPoint(event) {
        const matrix = view.map.getScreenCTM();
        if (!matrix) return null;
        const point = view.map.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        return point.matrixTransform(matrix.inverse());
    }

    view.map.addEventListener("pointerdown", (event) => {
        const entityElement = event.target.closest(".entity");
        if (!entityElement) return;
        draggedGuid = entityElement.dataset.guid;
        selectEntity(draggedGuid);
        view.map.setPointerCapture(event.pointerId);
    });

    view.map.addEventListener("pointermove", (event) => {
        if (!draggedGuid) return;
        const point = eventToWorldPoint(event);
        const entity = entityByGuid(draggedGuid);
        if (!point || !entity) return;

        entity.x = Math.round(
            clamp(point.x, -state.mapExtent, state.mapExtent) * 10
        ) / 10;
        entity.z = Math.round(
            clamp(point.y, -state.mapExtent, state.mapExtent) * 10
        ) / 10;
        controls.entityX.value = entity.x;
        controls.entityZ.value = entity.z;
        renderMaps();
        scheduleEvaluation();
    });

    function stopDragging(event) {
        if (draggedGuid && view.map.hasPointerCapture(event.pointerId)) {
            view.map.releasePointerCapture(event.pointerId);
        }
        draggedGuid = null;
    }

    view.map.addEventListener("pointerup", stopDragging);
    view.map.addEventListener("pointercancel", stopDragging);

    // 缩略图用于快速定位实体。点击标记只改变选中项，不直接改变坐标。
    view.overviewMap.addEventListener("click", (event) => {
        const entityElement = event.target.closest(".overview-entity");

        if (entityElement) {
            selectEntity(entityElement.dataset.guid);
        }
    });

    const policyControls = [
        controls.shape, controls.radius, controls.halfX, controls.halfY,
        controls.extentHalfY, controls.halfZ, controls.yaw, controls.halfAngle,
        controls.maxInterest, controls.heightEnabled, controls.minHeight,
        controls.maxHeight, controls.anyFlags, controls.needFlags,
        controls.forbidFlags, controls.backend, controls.gridSize,
        controls.mapExtent,
    ];

    for (const control of policyControls) {
        control.addEventListener("input", () => {
            readPolicyControls();
            renderMaps();
            scheduleEvaluation();
        });
    }

    for (const control of [
        controls.entityX,
        controls.entityY,
        controls.entityZ,
        controls.entityFlags,
    ]) {
        control.addEventListener("input", () => {
            readSelectedEntityControls();
            renderMaps();
            scheduleEvaluation();
        });
    }

    required("add-target").addEventListener("click", () => {
        const nextNumber = Math.max(0, ...state.targets.map((target) => {
            const match = /^target-(\d+)$/.exec(target.guid);
            return match ? Number(match[1]) : 0;
        })) + 1;
        const target = {
            guid: `target-${nextNumber}`,
            x: randomMapCoordinate(),
            y: 0,
            z: randomMapCoordinate(),
            flags: 1,
        };
        state.targets.push(target);
        selectEntity(target.guid);
        renderMaps();
        scheduleEvaluation();
    });

    view.removeTarget.addEventListener("click", () => {
        state.targets = state.targets.filter((target) => target.guid !== selectedGuid);
        selectedGuid = state.observer.guid;
        writeSelectedEntityControls();
        renderMaps();
        scheduleEvaluation();
    });

    required("reset").addEventListener("click", () => {
        state = createDefaultScenario();
        selectedGuid = state.observer.guid;
        result = emptyResult();
        previousInterestGuids = null;
        writeControls();
        render();
        evaluate();
    });

    writeControls();
    render();
    evaluate();
}());
