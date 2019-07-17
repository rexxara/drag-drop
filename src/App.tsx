import React, { Component } from 'react';
import { Button, Card } from 'antd';
const { Meta } = Card;
import './App.css';

function getAbsolute(reference: HTMLElement, target: HTMLElement) {
  var result = {
    left: -target.clientLeft,
    top: -target.clientTop
  }
  var node = target;
  while (node != reference) {
    result.left = result.left + node.offsetLeft + node.clientLeft;
    result.top = result.top + node.offsetTop + node.clientTop;
    // @ts-ignore
    node = node.parentNode;
  }
  if (isNaN(reference.scrollLeft)) {
    // @ts-ignore
    result.right = document.documentElement.scrollWidth - result.left;
    // @ts-ignore
    result.bottom = document.documentElement.scrollHeight - result.top;
  } else {
    // @ts-ignore
    result.right = reference.scrollWidth - result.left;
    // @ts-ignore
    result.bottom = reference.scrollHeight - result.top;
  }
  return result;
}

function getBase64(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = error => reject(error)
  });
}

interface IState {
  fileList: Array<ModifyedFiles>
  centerPositionsList: Array<centerPosition>
  timer: number | undefined
  dragingItem: ModifyedFiles | null
  previewX: number
  previewY: number
  previewIniX: number
  previewIniY: number
  pointerIniX: number
  pointerIniY: number
}
interface ModifyedFiles {
  name: string
  preview: string
  fileSize: number
}
interface centerPosition {
  centerX: number
  centerY: number
  id: string | null
}
interface closestPoint {
  closestPointId: string
  pos: string
}
class App extends Component {

  state: IState = {
    fileList: [],
    centerPositionsList: [],
    timer: undefined,
    dragingItem: null,
    previewIniX: 0,
    previewIniY: 0,
    pointerIniX: 0,
    pointerIniY: 0,
    previewX: 0,
    previewY: 0
  }

  private myRef = React.createRef<HTMLInputElement>()

  fakeBtnHandle = (): void => {
    const input = this.myRef.current as HTMLInputElement
    input.click()
  }
  fileChangeHandle = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    let arr: Array<ModifyedFiles> = []
    const files = ev.target.files || []
    for (let i: number = 0; i < files.length; i++) {
      let preview = await getBase64(files[i]) as string
      arr.push({
        preview: preview,
        name: files[i].name,
        fileSize: files[i].size
      })
    }
    this.setState({ fileList: arr })
  }
  dranEnterHandle = (ev: any): void => {
    const eventX: number = ev.clientX
    const eventY: number = ev.clientY
    this.setState({
      timer: setTimeout(() => {
        document.body.addEventListener("mousemove", this.mouseMoveHandle)
        let { fileList } = this.state
        this.computeDragPos()
        const { closestPointId: dragtargetName }: closestPoint = this.computeClosestCard(eventX, eventY)
        const dragingItem = fileList.find(v => v.name === dragtargetName)
        let iniX = 0
        let iniY = 0
        Array.prototype.filter.call(document.getElementsByClassName("dragableListItem"), (v, i) => {
          if (v.getAttribute("data-id") === dragtargetName) {
            let result = getAbsolute(document.body, v)
            iniX = result.left
            iniY = result.top
            return true
          }
        })
        this.setState({
          dragMode: true,
          dragingItem: dragingItem,
          fileList: fileList.filter(v => v.name !== dragtargetName),
          previewIniX: iniX,
          previewIniY: iniY,
          previewX: eventX,
          previewY: eventY,
          pointerIniX: eventX,
          pointerIniY: eventY
        })
      }, 1000)
    })
  }
  computeDragPos = (): void => {
    const items = document.getElementsByClassName("dragableListItem")
    let centerPositionsList: Array<centerPosition> = []
    for (let index = 0; index < items.length; index++) {
      const element = items[index] as HTMLDivElement

      let pos: centerPosition = {
        centerX: Math.floor(element.offsetLeft + element.clientWidth / 2),
        centerY: Math.floor(element.offsetTop + element.clientHeight / 2),
        id: element.getAttribute("data-id")
      }
      centerPositionsList.push(pos)
    }
    this.setState({ centerPositionsList })
  }
  dragLeaveHandle = (event: React.MouseEvent | MouseEvent): void => {
    clearTimeout(this.state.timer)
    const { fileList, dragingItem } = this.state
    if (this.state.fileList.length < 2 || dragingItem === null) return
    const { closestPointId: dragEndId, pos }: closestPoint = this.computeClosestCard(event.clientX, event.clientY)
    console.log(`move ${dragingItem.name} to ${dragEndId}'s ${pos}`)
    if (dragingItem.name !== dragEndId) {
      let dragEndIndex = fileList.findIndex(v => v.name === dragEndId)
      if (pos === 'left') dragEndIndex += 1
      fileList.splice(dragEndIndex, 0, dragingItem)
      this.setState({ fileList: fileList })
    } else {
      //放回原位
    }
    this.setState({
      dragingItem: null,
      previewIniX: 0,
      previewIniY: 0,
      pointerIniX: 0,
      pointerIniY: 0,
      previewX: 0,
      previewY: 0
    })
    document.body.removeEventListener("mousemove", this.mouseMoveHandle)
  }
  mouseMoveHandle = (event: MouseEvent): void => {
    this.setPreviewPos(event.clientX, event.clientY)
    // window.requestAnimationFrame(() => { this.setPreviewPos(event.clientX, event.clientY) })
  }
  setPreviewPos = (x: number, y: number): void => {
    this.setState({
      previewX: x, previewY: y
    })
  }
  componentDidMount() {
    document.body.addEventListener("mouseup", this.dragLeaveHandle)
  }
  componentWillUnmount() {
    document.body.removeEventListener("mouseup", this.dragLeaveHandle)
  }
  computeClosestCard = (evX: number, evY: number): closestPoint => {
    interface distanceWithId {
      distance: number
      id: string,
      pos: string
    }
    const { centerPositionsList, dragingItem } = this.state
    let distanceList: Array<distanceWithId>;
    let filtedcenterPositionsList: Array<centerPosition>;
    if (!dragingItem) {
      filtedcenterPositionsList = centerPositionsList
    } else {
      filtedcenterPositionsList = centerPositionsList.filter(v => v.id !== dragingItem.name)
    }
    distanceList = filtedcenterPositionsList.map(v => {
      return {
        distance: Math.floor(Math.sqrt((v.centerX - evX) ** 2 + (v.centerY - evY) ** 2)),
        id: v.id || "",
        pos: v.centerX - evX >= 0 ? "right" : "left"
      }
    })
    const closestPoint = distanceList.reduce((current, it) => current.distance < it.distance ? current : it)
    return {
      closestPointId: closestPoint.id, pos: closestPoint.pos
    }
  }
  render() {
    const { fileList, dragingItem, previewX, previewY, previewIniY, previewIniX, pointerIniY, pointerIniX } = this.state
    return (
      <div className="App">
        <Button type="primary" icon="upload" onClick={this.fakeBtnHandle} size="large">
          不搞了不搞了
        </Button>
        <input ref={this.myRef} className="fileInput" type="file" multiple={true} accept=".jpg, .png, .gif" onChange={this.fileChangeHandle} />
        <div className="imgList">
          {fileList.map(v => <Card
            hoverable
            key={v.name}
            className="dragableListItem"
            data-id={v.name}
            style={{ width: 240, margin: "10px", opacity: dragingItem !== null ? 0.5 : 1 }}
            cover={<img draggable={false} alt={v.name} src={v.preview} />}
            onMouseDown={this.dranEnterHandle}
          >
            <Meta title={v.name} description={(v.fileSize / 1024).toFixed(1) + "KB"} />
          </Card>
          )}
        </div>
        {dragingItem ? <Card
          hoverable
          data-id={dragingItem.name}
          style={{ width: 240, margin: "10px", position: 'absolute', top: (previewY + previewIniY - pointerIniY), left: (previewX + previewIniX - pointerIniX), zIndex: 999 }}
          cover={<img draggable={false} alt={dragingItem.name} src={dragingItem.preview} />}
        >
          <Meta title={dragingItem.name} description={(dragingItem.fileSize / 1024).toFixed(1) + "KB"} />
        </Card> : null}

      </div>

    )
  }
}

export default App