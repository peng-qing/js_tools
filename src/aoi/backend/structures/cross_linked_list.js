"use strict";

/**
 * 交叉链表节点 同时挂在 X/Z 轴双向链表
 * 链表按照 轴坐标、EntityId 次序排序
 * 两条链共享同一个节点和 EntityId，因此一次查询不会产生重复候选
 */
class CrossLinkedListNode {
    constructor(entityId, pos) {
        /**
         * 实体ID
         * @type {number}
         */
        this.entityId = entityId;
        /**
         * 实体位置
         * @type {import("../../geometry/position.js")}
         */
        this.pos = pos;
        /**
         * X 轴双向链表前驱节点
         * @type {CrossLinkedListNode | null}
         */
        this.prevNodeX = null;
        /**
         * X 轴双向链表后继节点
         * @type {CrossLinkedListNode | null}
         */
        this.nextNodeX = null;
        /**
         * Z 轴双向链表前驱节点
         * @type {CrossLinkedListNode | null}
         */
        this.prevNodeZ = null;
        /**
         * Z 轴双向链表后继节点
         * @type {CrossLinkedListNode | null}
         */
        this.nextNodeZ = null;
    }
}

/**
 * 闭区间轴向范围游标
 * 游标保存当前节点和扫描方向 每次调用 next 方法时 游标会自动向前移动
 */
class AxisRangeCursor {
    /**
     * 构造函数
     * @param {SortedAxisLinkedList} list 链表
     * @param {CrossLinkedListNode} node 当前节点
     * @param {number} boundary 边界值
     * @param {boolean} forward 扫描方向
     */
    constructor(list, node, boundary, forward) {
        /**
         * 链表
         * @type {SortedAxisLinkedList | null}
         */
        this._list = list;
        /**
         * 当前节点
         * @type {CrossLinkedListNode}
         */
        this._node = node;
        /**
         * 边界值
         * @type {number}
         */
        this._boundary = boundary;
        /**
         * 扫描方向 是否向后扫描
         * @type {boolean}
         */
        this._forward = forward;
    }

    /**
     * 移动游标到下一个节点
     * @returns {CrossLinkedListNode | null}
     */
    next() {
        const node = this._node;
        if (!node) {
            return null;
        }
        const coordinate = this._list.coordinate(node);
        const outside = this._forward ? coordinate > this._boundary : coordinate < this._boundary;
        if (outside) {
            this._node = null;
            return null;
        }

        this._node = this._forward ? this._list.next(node) : this._list.prev(node);
        return node;
    }
}

/**
 * 有序轴向链表 按照 Position 单轴排序的侵入式双向链表
 * “侵入式”表示链表不创建包装节点，而是直接读写实体节点上的前后指针。
 * 当前作为纯虚类 只实现与轴无关的排序、插入、摘除和区间扫描算法。
 */
class SortedAxisLinkedList {
    constructor() {
        if (new.target === SortedAxisLinkedList) {
            throw new TypeError("SortedAxisLinkedList is a pure virtual class");
        }
        /**
         * 头节点
         * @type {CrossLinkedListNode | null}
         */
        this.head = null;
        /**
         * 尾节点
         * @type {CrossLinkedListNode | null}
         */
        this.tail = null;
    }

    /**
     * 按照 (轴坐标, EntityId) 次序插入节点
     * 从坐标距离更近的端点开始插入
     * @param {CrossLinkedListNode} node 
     */
    insert(node) {
        // 空链表
        if (!this.head) {
            this.head = node;
            this.tail = node;
            return;
        }
        // 估算轴向距离 选择插入端点
        const coordinateVal = this.coordinate(node);
        const fromHead = Math.abs(coordinateVal - this.coordinate(this.head));
        const fromTail = Math.abs(coordinateVal - this.coordinate(this.tail));
        if (fromHead <= fromTail) {
            // 从头部插入
            let curNode = this.head;
            while (curNode && this.compare(curNode, node) <= 0) {
                // curNode <= node 继续向后扫描
                curNode = this.next(curNode);
            }
            // 如果扫描到了比当前节点大的节点 就在这个节点之前前插入
            // 如果没扫描到 说明当前节点是最大的 插入到尾部
            curNode ? this._insertBefore(node, curNode) : this._insertAfter(node, this.tail);
            return;
        }
        // 从尾部插入
        let curNode = this.tail;
        while (curNode && this.compare(curNode, node) >= 0) {
            // curNode >= node 继续向前扫描
            curNode = this.prev(curNode);
        }
        // 如果扫描到了比当前节点小的节点 就在这个节点之后插入
        // 如果没扫描到 说明当前节点是最小的 插入到头部
        curNode ? this._insertAfter(node, curNode) : this._insertBefore(node, this.head);
    }

    /**
     * 移除节点
     * @param {CrossLinkedListNode} node 
     */
    remove(node) {
        const prevNode = this.prev(node);
        const nextNode = this.next(node);
        // 有前驱设置后继 无前驱设置头节点` 
        prevNode ? this.setNext(prevNode, nextNode) : this.head = nextNode;
        // 有后继设置前驱 无后继设置尾节点
        nextNode ? this.setPrev(nextNode, prevNode) : this.tail = prevNode;
        // 设置前驱和后继为 null
        this.setPrev(node, null);
        this.setNext(node, null);
    }

    /**
     * 清空链表节点
     */
    clear() {
        this.head = null;
        this.tail = null;
    }

    /**
     * 创建范围游标 闭区间
     * 定位规则：
     *  1. 如果区间靠近head 则从头部开始扫描 找到第一个轴向大于等于 min 的节点
     *  2. 如果区间靠近tail 则从尾部开始扫描 找到第一个轴向小于等于 max 的节点
     *  3. 必须要严格 >min 或者 < max， 确保是闭区间落入
     * @param {number} min 最小值
     * @param {number} max 最大值
     * @returns {AxisRangeCursor}
     */
    createAxisRangeCursor(min, max) {
        if (!this.head) {
            return new AxisRangeCursor(this, null, min, true);
        }
        // 估算轴向距离 选择插入端点
        const headDistance = Math.abs(this.coordinate(this.head) - min);
        const tailDistance = Math.abs(this.coordinate(this.tail) - max);
        if (headDistance <= tailDistance) {
            let node = this.head;
            // 从头部开始扫描 找到第一个轴向大于等于 min 的节点
            while (node && this.coordinate(node) < min) {
                node = this.next(node);
            }
            return new AxisRangeCursor(this, node, max, true);
        }
        // 从尾部开始扫描 找到第一个轴向小于等于 max 的节点
        let node = this.tail;
        while (node && this.coordinate(node) > max) {
            node = this.prev(node);
        }
        // 反向扫描从不大于 max 的节点开始，直到坐标小于 min 时结束。
        // AxisRangeCursor 在反向模式下使用 coordinate < boundary 判断越界，
        // 因此这里必须传入区间下界 min，而不是用于定位起点的 max。
        return new AxisRangeCursor(this, node, min, false);
    }

    /**
     * 查询区间与当前实体坐标轴跨度的覆盖比例，用于估算扫描 X 还是 Z。
     * 返回0 表示完全落在区间外 返回1 表示完全落在区间内
     * @param {number} min 最小值
     * @param {number} max 最大值
     * @returns {number} 0-1 之间的小数 表示覆盖比例
     */
    coverageRatio(min, max) {
        if (!this.head) {
            return 0;
        }
        const first = this.coordinate(this.head);
        const last = this.coordinate(this.tail);
        if (first === last) {
            // 链表只包含一个节点 如果完全落入闭区间 返回1 否则返回0
            return min <= first && max >= first ? 1 : 0;
        }
        // 裁剪区间跨度交集
        const overlap = Math.max(0, Math.min(max, last) - Math.max(min, first));
        // 计算覆盖比例
        return overlap / (Math.abs(last - first));
    }

    /**
     * 比较两个节点次序 按照 (轴坐标, EntityId) 次序
     * 返回一个有符号数
     * 小于0表示 node1 在 node2 之前
     * 大于0表示 node1 在 node2 之后
     * 等于0表示 node1 和 node2 排序相同
     * @param {CrossLinkedListNode} node1 
     * @param {CrossLinkedListNode} node2 
     * @returns {number}
     */
    compare(node1, node2) {
        return (
            this.coordinate(node1) - this.coordinate(node2) ||
            node1.entityId - node2.entityId
        )
    }

    /**
     * 在 curNode 之前插入节点 
     * curNode 节点必须存在且为链表中的节点
     * @param {CrossLinkedListNode} node 
     * @param {CrossLinkedListNode} curNode 
     */
    _insertBefore(node, curNode) {
        const prevNode = this.prev(curNode);
        this.setPrev(node, prevNode);
        this.setNext(node, curNode);
        this.setPrev(curNode, node);
        // 有前驱设置后继 无前驱设置头节点
        prevNode ? this.setNext(prevNode, node) : this.head = node;
    }

    /**
     * 在 curNode 之后插入节点
     * curNode 节点必须存在且为链表中的节点
     * @param {CrossLinkedListNode} node 
     * @param {CrossLinkedListNode} curNode 
     */
    _insertAfter(node, curNode) {
        const nextNode = this.next(curNode);
        this.setPrev(node, curNode);
        this.setNext(node, nextNode);
        this.setNext(curNode, node);
        // 有后继设置前驱 无后继设置尾节点
        nextNode ? this.setPrev(nextNode, node) : this.tail = node;
    }

    /**
     * 获取节点轴向坐标
     * @param {CrossLinkedListNode} node 
     * @returns {number}
     */
    coordinate(node) {
        void node;
        throw new Error("Method coordinate not implemented");
    }

    /**
     * 获取后继节点
     * @param {CrossLinkedListNode} node 
     * @returns {CrossLinkedListNode | null}
     */
    next(node) {
        void node;
        throw new Error("Method next not implemented");
    }

    /**
     * 设置后继节点
     * @param {CrossLinkedListNode} node 
     * @param {CrossLinkedListNode} nextNode 
     */
    setNext(node, nextNode) {
        void node;
        void nextNode;
        throw new Error("Method setNext not implemented");
    }

    /**
     * 获取前驱节点
     * @param {CrossLinkedListNode} node 
     * @returns {CrossLinkedListNode | null}
     */
    prev(node) {
        void node;
        throw new Error("Method prev not implemented");
    }

    /**
     * 设置前驱节点
     * @param {CrossLinkedListNode} node 
     * @param {CrossLinkedListNode} prevNode 
     */
    setPrev(node, prevNode) {
        void node;
        void prevNode;
        throw new Error("Method setPrev not implemented");
    }
}

class XSortedAxisLinkedList extends SortedAxisLinkedList {
    constructor() {
        super();
    }

    /**
     * 获取节点 X 轴坐标
     * @param {CrossLinkedListNode} node 
     * @returns {number}
     */
    coordinate(node) {
        return node.pos.x;
    }

    /**
     * 获取前驱节点
     * @param {CrossLinkedListNode} node 
     * @returns {CrossLinkedListNode | null}
     */
    prev(node) {
        return node.prevNodeX;
    }

    /**
     * 获取后继节点
     * @param {CrossLinkedListNode} node 
     * @returns {CrossLinkedListNode | null}
     */
    next(node) {
        return node.nextNodeX;
    }

    /**
     * 设置前驱节点
     * @param {CrossLinkedListNode} node 
     * @param {CrossLinkedListNode} prevNode 
     */
    setPrev(node, prevNode) {
        node.prevNodeX = prevNode;
    }

    /**
     * 设置后继节点
     * @param {CrossLinkedListNode} node 
     * @param {CrossLinkedListNode} nextNode 
     */
    setNext(node, nextNode) {
        node.nextNodeX = nextNode;
    }
}

class ZSortedAxisLinkedList extends SortedAxisLinkedList {
    constructor() {
        super();
    }

    /**
     * 获取节点 Z 轴坐标
     * @param {CrossLinkedListNode} node 
     * @returns {number}
     */
    coordinate(node) {
        return node.pos.z;
    }

    /**
     * 获取前驱节点
     * @param {CrossLinkedListNode} node 
     * @returns {CrossLinkedListNode | null}
     */
    prev(node) {
        return node.prevNodeZ;
    }

    /**
     * 获取后继节点
     * @param {CrossLinkedListNode} node 
     * @returns {CrossLinkedListNode | null}
     */
    next(node) {
        return node.nextNodeZ;
    }

    /**
     * 设置前驱节点
     * @param {CrossLinkedListNode} node 
     * @param {CrossLinkedListNode} prevNode 
     */
    setPrev(node, prevNode) {
        node.prevNodeZ = prevNode;
    }

    /**
     * 设置后继节点
     * @param {CrossLinkedListNode} node 
     * @param {CrossLinkedListNode} nextNode 
     */
    setNext(node, nextNode) {
        node.nextNodeZ = nextNode;
    }
}

class YSortedAxisLinkedList extends SortedAxisLinkedList {
    constructor() {
        super();
    }

    /**
     * 获取节点 Y 轴坐标
     * @param {CrossLinkedListNode} node 
     * @returns {number}
     */
    coordinate(node) {
        return node.pos.y;
    }

    /**
     * 获取前驱节点
     * @param {CrossLinkedListNode} node 
     * @returns {CrossLinkedListNode | null}
     */
    prev(node) {
        return node.prevNodeY;
    }

    /**
     * 获取后继节点
     * @param {CrossLinkedListNode} node 
     * @returns {CrossLinkedListNode | null}
     */
    next(node) {
        return node.nextNodeY;
    }

    /**
     * 设置前驱节点
     * @param {CrossLinkedListNode} node 
     * @param {CrossLinkedListNode} prevNode 
     */
    setPrev(node, prevNode) {
        node.prevNodeY = prevNode;
    }

    /**
     * 设置后继节点
     * @param {CrossLinkedListNode} node 
     * @param {CrossLinkedListNode} nextNode 
     */
    setNext(node, nextNode) {
        node.nextNodeY = nextNode;
    }
}

module.exports = {
    CrossLinkedListNode,
    SortedAxisLinkedList,
    XSortedAxisLinkedList,
    ZSortedAxisLinkedList,
    YSortedAxisLinkedList,
};
