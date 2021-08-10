import { useState, Fragment, useMemo } from "react";
import styles from "./AdminPanel.module.css";
import CmsPropsType, {
  noneType,
  inputType,
  objectType,
  arrayType,
} from "./AdminPanelType";
import panelIcon from "./icons";
import Input from "./components/Input";
import TitleArray from "./components/TitleArray";
import TitleInfo from "./components/TitleInfo";
import { resolvePathToRealObjectWithArray } from "./utils";

interface Props {
  data: any;
  currentConfig: CmsPropsType | noneType | inputType | objectType | arrayType;
  pressOnElement: (index: number, lineInArray?: number) => void;
  specificIndexInField?: number[];
  onPressBack: () => void;
  onUpdateInput: (path: string, value: string, htmlId?: string) => void;
  onReset: () => void;
  onSave: () => void;
  onLogout: () => void;
  contentHasChange: boolean;
  onReoder: () => void;
  onAdd: (newArr: any[], positionInJsonValue: string, index: number) => void;
  onDelete: (newArr: any[], positionInJsonValue: string) => void;
  title: string;
}

function AdminPanel({
  data: dataProps,
  currentConfig: currentConfigProps,
  pressOnElement,
  specificIndexInField,
  onPressBack,
  onUpdateInput,
  onReset,
  onSave,
  onLogout,
  contentHasChange = false,
  onReoder,
  onDelete,
  onAdd,
  title,
}: Props) {
  const [panelIsOpen, setPanelIsOpen] = useState(false);

  function renderWhatWeWant(
    configValue: CmsPropsType | noneType | inputType | objectType | arrayType,
    indexOfField?: number | undefined,
    nbrIncrementation: number = 0
  ): any {
    if (configValue.type === "firstLvl") {
      return configValue.fields.map((el, index) => (
        <TitleArray
          key={el.title}
          label={el.title}
          onClick={() => {
            pressOnElement(index);
          }}
        />
      ));
    } else if (configValue.type === "none") {
      return configValue.fields.map((el, index) =>
        renderWhatWeWant(el, index, nbrIncrementation + 1)
      );
    } else if (configValue.type === "array") {
      // for print a specif value on Array
      if (nbrIncrementation === 0) {
        return configValue.fields.map((el, index) =>
          renderWhatWeWant(el, index, nbrIncrementation + 1)
        );
      }
      const arrOfNameValue = `${configValue.value}.${configValue.referenceFieldKey}`;
      return (
        <Fragment key={`${configValue.title}-div`}>
          <div className={styles.headerOfArrayType}>
            <p key={`${configValue.title}-paragraph`}>{configValue.title}</p>
            <img
              onClick={() => {
                onAdd(
                  [
                    ...resolvePathToRealObjectWithArray(
                      configValue.value!,
                      dataProps
                    ),
                    { [configValue.referenceFieldKey]: "" },
                  ],
                  configValue.value!,
                  indexOfField!
                );
              }}
              src={panelIcon.add}
              className={styles.iconAdd}
              alt="décconexion"
            />
          </div>
          {resolvePathToRealObjectWithArray(arrOfNameValue, dataProps).map(
            (el: string, line: number) => {
              return (
                <TitleArray
                  key={`-key${el}`}
                  label={el}
                  onClick={() => {
                    pressOnElement(indexOfField!, line);
                  }}
                  canDelete={configValue.canDelete}
                  onDelete={() => {
                    onDelete(
                      (
                        resolvePathToRealObjectWithArray(
                          configValue.value!,
                          dataProps
                        ) as any[]
                      ).filter((el, index) => index !== line),
                      configValue.value!
                    );
                  }}
                  onReoder={() => {
                    console.log("onReoder");
                  }}
                  canReoder={configValue.canReoder}
                />
              );
            }
          )}
        </Fragment>
      );
    } else if (configValue.type === "input") {
      let path = configValue.value;
      if (
        configValue.value.includes("[]") &&
        specificIndexInField &&
        !!specificIndexInField.length
      ) {
        const newValue = configValue.value.split("[]");
        path =
          newValue.length === 0
            ? configValue.value
            : `${newValue[0]}[${specificIndexInField[0]}]${newValue[1]}`;
      }
      const value = resolvePathToRealObjectWithArray(path, dataProps);

      return (
        <Input
          label={configValue.title}
          value={value}
          onChange={(newValue) =>
            onUpdateInput(path, newValue, configValue.htmlId)
          }
          nameForAutoComplete={configValue.title}
          key={configValue.id}
        />
      );
    } else if (configValue.type === "object") {
      if (nbrIncrementation >= 1) {
        return (
          <TitleInfo
            key={`${configValue.title}-object`}
            label={configValue.title}
            onClick={() => pressOnElement(indexOfField!)}
          />
        );
      }
      return configValue.fields.map((el, index) =>
        renderWhatWeWant(el, index, nbrIncrementation + 1)
      );
    }
    return null;
  }

  function onTogglePanel() {
    setPanelIsOpen(!panelIsOpen);
  }

  const printCurrentTitle = useMemo(() => {
    if (!currentConfigProps || currentConfigProps.type === "firstLvl") {
      return undefined;
    }
    if (["none", "object", "array"].includes(currentConfigProps.type)) {
      return currentConfigProps.title;
    }
    return undefined;
  }, [currentConfigProps]);

  // for the resize
  let isDragging = false;
  let adminPanelElement = document.getElementById("AdminPanel-content");
  let target = document.getElementById("AdminPanel-dragbar");

  function clearJSEvents() {
    isDragging = false;
    document.body.removeEventListener("mousemove", resize);
    adminPanelElement?.classList.remove(styles.resizing);
  }

  function resize(e: any) {
    if (e.pageX < 300) {
      return;
    }
    if (adminPanelElement) {
      adminPanelElement.style.setProperty("--card-width", e.pageX + "px");
    }
  }

  if (target) {
    target.onmousedown = function (e) {
      e.preventDefault();
      isDragging = true;
      document.body.addEventListener("mousemove", resize);
      adminPanelElement?.classList.add(styles.resizing);
    };
  }

  document.onmouseup = () => {
    isDragging! && clearJSEvents();
  };
  // end resizing

  return (
    <div
      className={`${styles.card} ${panelIsOpen ? "" : styles.cardIsClose}`}
      id="AdminPanel-content"
    >
      <div className={styles.dragbar} id="AdminPanel-dragbar" />
      <div className={styles.header}>
        <p className={styles.title}>{title}</p>
        <div onClick={onLogout} className={styles.divLogout}>
          <img
            src={panelIcon.logout}
            className={styles.iconLogout}
            alt="décconexion"
          />
        </div>
      </div>
      <div className={styles.content}>
        {printCurrentTitle && (
          <div className={styles.currentContent} onClick={onPressBack}>
            <img
              alt="BackIcon"
              src={panelIcon.chevronLeft}
              className={styles.iconCurrentContent}
            />
            <p className={styles.textCurrentContent}>{printCurrentTitle}</p>
          </div>
        )}
        {renderWhatWeWant(currentConfigProps)}
      </div>
      <div className={styles.footer}>
        {currentConfigProps.type === "firstLvl" ? (
          <>
            <div
              className={`${styles.buttonReset} ${
                !contentHasChange && styles.buttonDisabled
              }`}
              onClick={() => contentHasChange && onReset()}
            >
              <p>Reset</p>
            </div>
            <div
              className={`${styles.buttonSave} ${
                !contentHasChange && styles.buttonDisabled
              }`}
              onClick={() => contentHasChange && onSave()}
            >
              <p>Sauvegarder</p>
            </div>
          </>
        ) : (
          <p>
            {contentHasChange
              ? "Contenu modifié"
              : "Développer par NJG Connect"}
          </p>
        )}
      </div>
      <div className={styles.togglePanel} onClick={onTogglePanel}>
        <img
          alt="edit"
          src={panelIsOpen ? panelIcon.whiteChevronLeft : panelIcon.edit}
          className={styles.iconToggle}
        />
      </div>
    </div>
  );
}

export default AdminPanel;
