import * as React from 'react';
import $ from 'jquery';
import { observer } from 'mobx-react';
import arrayMove from 'array-move';
import { AutoSizer, CellMeasurer, InfiniteLoader, List as VList, CellMeasurerCache } from 'react-virtualized';
import { SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc';
import { I, C, S, J, U, keyboard, Dataview, translate, analytics } from 'Lib';
import { Icon, IconObject, Switch } from 'Component';

const HEIGHT = 28;
const LIMIT = 20;

const MenuRelationList = observer(class MenuRelationList extends React.Component<I.Menu> {
	
	node: any = null;
	n = -1;
	top = 0;
	cache: any = {};
	refList: any = null;

	constructor (props: I.Menu) {
		super(props);
		
		this.onAdd = this.onAdd.bind(this);
		this.onClick = this.onClick.bind(this);
		this.onSortStart = this.onSortStart.bind(this);
		this.onSortEnd = this.onSortEnd.bind(this);
		this.onSwitch = this.onSwitch.bind(this);
		this.onScroll = this.onScroll.bind(this);
	};
	
	render () {
		const { getId, setHover, param } = this.props;
		const { data } = param;
		const { getView } = data;
		const isReadonly = this.isReadonly();
		const items = this.getItems();
		const view = getView();

		items.map((it: any) => {
			const { format, name } = it.relation;
		});

		const Handle = SortableHandle(() => (
			<Icon className="dnd" />
		));

		const Item = SortableElement((item: any) => {
			const isName = item.relationKey == 'name';
			const canHide = !isReadonly && (!isName || (view.type == I.ViewType.Gallery));
			const cn = [ 'item' ];
			
			if (item.relation.isHidden) {
				cn.push('isHidden');
			};
			if (isReadonly) {
				cn.push('isReadonly');
			};

			return (
				<div 
					id={'item-' + item.relationKey} 
					className={cn.join(' ')} 
					onMouseEnter={e => this.onMouseEnter(e, item)}
					style={item.style}
				>
					{!isReadonly ? <Handle /> : ''}
					<span className="clickable" onClick={e => this.onClick(e, item)}>
						<IconObject object={item.relation} />
						<div className="name">{item.relation.name}</div>
					</span>
					{canHide ? (
						<Switch 
							value={item.isVisible} 
							onChange={(e: any, v: boolean) => this.onSwitch(e, item, v)} 
						/>
					) : ''}
				</div>
			);
		});
		
		const rowRenderer = (param: any) => {
			const item: any = items[param.index];

			return (
				<CellMeasurer
					key={param.key}
					parent={param.parent}
					cache={this.cache}
					columnIndex={0}
					rowIndex={param.index}
				>
					<Item key={item.id} {...item} index={param.index} style={param.style} />
				</CellMeasurer>
			);
		};
		
		const List = SortableContainer((item: any) => (
			<div className="items">
				<InfiniteLoader
					rowCount={items.length}
					loadMoreRows={() => {}}
					isRowLoaded={() => true}
					threshold={LIMIT}
				>
					{({ onRowsRendered }) => (
						<AutoSizer className="scrollArea">
							{({ width, height }) => (
								<VList
									ref={ref => this.refList = ref}
									width={width}
									height={height}
									deferredMeasurmentCache={this.cache}
									rowCount={items.length}
									rowHeight={HEIGHT}
									rowRenderer={rowRenderer}
									onRowsRendered={onRowsRendered}
									overscanRowCount={LIMIT}
									onScroll={this.onScroll}
									scrollToAlignment="center"
								/>
							)}
						</AutoSizer>
					)}
				</InfiniteLoader>
			</div>
		));
		
		return (
			<div 
				ref={node => this.node = node}
				className="wrap"
			>
				<List 
					axis="y" 
					lockAxis="y"
					lockToContainerEdges={true}
					transitionDuration={150}
					distance={10}
					onSortStart={this.onSortStart}
					onSortEnd={this.onSortEnd}
					useDragHandle={true}
					helperClass="isDragging"
					helperContainer={() => $(`#${getId()} .items`).get(0)}
				/>

				{!isReadonly ? (
					<div className="bottom">
						<div className="line" />
						<div 
							id="item-add" 
							className="item add" 
							onClick={this.onAdd} 
							onMouseEnter={() => setHover({ id: 'add' })} 
							onMouseLeave={() => setHover()}
						>
							<Icon className="plus" />
							<div className="name">{translate('commonAddRelation')}</div>
						</div>
					</div>
				) : ''}
			</div>
		);
	};

	componentDidMount() {
		const items = this.getItems();

		this.rebind();
		this.resize();

		this.cache = new CellMeasurerCache({
			fixedWidth: true,
			defaultHeight: HEIGHT,
			keyMapper: i => (items[i] || {}).id,
		});
	};
	
	componentDidUpdate () {
		this.resize();
		this.rebind();

		this.props.setActive(null, true);
		this.props.position();

		if (this.refList && this.top) {
			this.refList.scrollToPosition(this.top);
		};
	};

	componentWillUnmount () {
		this.unbind();
		S.Menu.closeAll(J.Menu.cell);
	};

	rebind () {
		this.unbind();
		$(window).on('keydown.menu', e => this.onKeyDown(e));
		window.setTimeout(() => this.props.setActive(), 15);
	};
	
	unbind () {
		$(window).off('keydown.menu');
	};

	onKeyDown (e: any) {
		const items = this.getItems();
		const item = items[this.n];

		let ret = false;

		keyboard.shortcut('space', e, (pressed: string) => {
			e.preventDefault();

			if (item) {
				this.onSwitch(e, item, !item.isVisible);
			};
			ret = true;
		});

		if (ret) {
			return;
		};

		this.props.onKeyDown(e);
	};

	onAdd (e: any) {
		const { param, getId, getSize } = this.props;
		const { data } = param;
		const { rootId, blockId, getView, onAdd } = data;
		const view = getView();
		const relations = Dataview.viewGetRelations(rootId, blockId, view);
		const object = S.Detail.get(rootId, rootId);

		S.Menu.open('relationSuggest', { 
			element: `#${getId()} #item-add`,
			offsetX: getSize().width,
			vertical: I.MenuDirection.Top,
			offsetY: 36,
			noAnimation: true,
			noFlipY: true,
			data: {
				...data,
				menuIdEdit: 'dataviewRelationEdit',
				filter: '',
				ref: 'dataview',
				skipKeys: relations.map(it => it.relationKey),
				addCommand: (rootId: string, blockId: string, relation: any, onChange: (message: any) => void) => {
					const cb = (message: any) => {
						if (onAdd) {
							onAdd();
						};

						if (onChange) {
							onChange(message);
						};
					};

					Dataview.addTypeOrDataviewRelation(rootId, blockId, relation, object, view, relations.length, cb);
				},
			}
		});
	};

	onMouseEnter (e: any, item: any) {
		if (!keyboard.isMouseDisabled) {
			this.props.setActive(item, false);
		};
	};
	
	onClick (e: any, item: any) {
		const { param, getId } = this.props;
		const { data } = param;
		const { readonly, rootId, getView } = data;
		const relation = S.Record.getRelationByKey(item.relationKey);
		const object = S.Detail.get(rootId, rootId);
		const isType = U.Object.isTypeLayout(object.layout);
		const view = getView();

		if (!relation || readonly || !view) {
			return;
		};

		let unlinkCommand = null;
		if (isType) {
			unlinkCommand = (rootId: string, blockId: string, relation: any, onChange: (message: any) => void) => {
				U.Object.typeRelationUnlink(object.id, relation.id, onChange);
			};
		};

		S.Menu.open('dataviewRelationEdit', { 
			element: `#${getId()} #item-${item.relationKey}`,
			horizontal: I.MenuDirection.Center,
			noAnimation: true,
			data: {
				...data,
				relationId: relation.id,
				unlinkCommand,
			}
		});
	};

	onSortStart () {
		keyboard.disableSelection(true);
	};

	onSortEnd (result: any) {
		const { oldIndex, newIndex } = result;
		const { param } = this.props;
		const { data } = param;
		const { rootId, blockId, getView } = data;
		const view = getView();
		const list = arrayMove(this.getItems(), oldIndex, newIndex).map(it => it && it.relationKey);

		C.BlockDataviewViewRelationSort(rootId, blockId, view.id, list);
		keyboard.disableSelection(false);
	};

	onSwitch (e: any, item: any, v: boolean) {
		const { param } = this.props;
		const { data } = param;
		const { rootId, blockId, getView } = data;
		const view = getView();
		const object = S.Detail.get(rootId, rootId);
		const relation = S.Record.getRelationByKey(item.relationKey);

		C.BlockDataviewViewRelationReplace(rootId, blockId, view.id, item.relationKey, { ...item, isVisible: v });

		analytics.event('ShowDataviewRelation', { type: v ? 'True' : 'False', relationKey: item.relationKey, format: relation.format, objectType: object.type });
	};

	onScroll ({ scrollTop }) {
		if (scrollTop) {
			this.top = scrollTop;
		};
	};

	getItems () {
		const { param } = this.props;
		const { data } = param;
		const { rootId, blockId, getView } = data;
		const view = getView();

		return Dataview.viewGetRelations(rootId, blockId, view).map((it: any) => ({ 
			...it,
			id: it.relationKey,
			relation: S.Record.getRelationByKey(it.relationKey) || {},
		}));
	};

	resize () {
		const { getId, position } = this.props;
		const items = this.getItems();
		const obj = $(`#${getId()} .content`);
		const offset = !this.isReadonly() ? 62 : 16;
		const height = Math.max(HEIGHT * 2, Math.min(360, items.length * HEIGHT + offset));

		obj.css({ height });
		position();
	};

	isReadonly () {
		const { param } = this.props;
		const { data } = param;
		const { rootId, blockId, readonly } = data;
		const allowedView = S.Block.checkFlags(rootId, blockId, [ I.RestrictionDataview.View ]);

		return readonly || !allowedView;
	};
	
});

export default MenuRelationList;
