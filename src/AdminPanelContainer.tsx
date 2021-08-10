import React, { useState, useEffect, useCallback, useMemo } from "react";
import CmsPropsType, {
  noneType,
  inputType,
  objectType,
  arrayType,
} from "./AdminPanelType";
import { fetchJsonDataFromGit, updateJsonDataOnGit } from "./api/git";
import AdminPanel from "./AdminPanel";
import { resolvePathToRealObjectWithArray } from "./utils";
declare global {
  interface Window {
    netlifyIdentity: any;
  }
}

interface Props {
  parameter: CmsPropsType;
  githubToken: string;
}

function AdminPanelContainer({ parameter, githubToken }: Props) {
  // This State never change after initial just add value with good path of the jsonValue
  const [originConfig, setOriginConfig] = useState<CmsPropsType>({
    ...parameter,
  });

  // state of originConfig but add value property with path of real data
  const [currentConfig, setcurrentConfig] = useState<
    CmsPropsType | noneType | inputType | objectType | arrayType
  >({ ...originConfig });

  // real data
  const [jsonValue, setjsonValue] = useState({});
  const [originJsonValue, setOriginJsonValue] = useState({});
  const [jsonValueSha, setjsonValueSha] = useState({});
  // its the navigation of the panelAdmin
  const [position, setPosition] = useState<{
    positionInConfigFile: Array<number | undefined>;
    lineInArray: Array<number>;
  }>({ positionInConfigFile: [], lineInArray: [] });

  // transform the currentConfig with current Position ( if user click on element)
  const currentConfigWithGoodPosition = useMemo(() => {
    if (
      !position.positionInConfigFile.length &&
      position.positionInConfigFile.includes(undefined)
    ) {
      return currentConfig;
    }

    let newValue = position.positionInConfigFile.reduce(
      (prev, currentValue) => {
        if (currentValue !== undefined && prev.type !== "input") {
          return prev.fields[currentValue];
        } else {
          return prev;
        }
      },
      currentConfig
    );

    return newValue;
  }, [currentConfig, position]);

  const contentHasChange = useMemo(
    () => !(JSON.stringify(originJsonValue) === JSON.stringify(jsonValue)),
    [originJsonValue, jsonValue]
  );

  //  know if user is loggin or not
  const [userIsLoggin, setuserLoggin] = useState(false);

  // its url for login or not
  const isUrlForLogin: boolean = window.location.pathname.includes(
    parameter.urlForLogin
  );

  // fonction recursive configure and add real data on state JsonValue + add path the real value on input
  const whatWeWant = useCallback(
    async (
      subCategory: noneType | inputType | objectType | arrayType,
      lvlNameOfArrayOrObject: Array<string> = [],
      dataFetched?: any | undefined
    ) => {
      try {
        if (subCategory.type === "array") {
          const newLvlNameOfArrayOrObject: Array<string> = [
            ...lvlNameOfArrayOrObject,
            subCategory.id,
            "[]",
          ];
          const newSubCategory = {
            ...subCategory,
            value: newLvlNameOfArrayOrObject.join("."),
          };
          newSubCategory.fields = (await Promise.all(
            newSubCategory.fields.map(async (element) => {
              const result = await whatWeWant(
                element,
                newLvlNameOfArrayOrObject,
                dataFetched
              );
              return result || element;
            })
          )) as inputType[];
          return newSubCategory;
        } else if (subCategory.type === "input") {
          const newLvlNameOfArrayOrObject: Array<string> = [
            ...lvlNameOfArrayOrObject,
            subCategory.id,
          ];
          return {
            ...subCategory,
            value: newLvlNameOfArrayOrObject.join("."),
          };
        } else if (subCategory.type === "object") {
          const newLvlNameOfArrayOrObject: Array<string> = [
            ...lvlNameOfArrayOrObject,
            subCategory.id,
          ];
          const newSubCategory = { ...subCategory };

          newSubCategory.fields = (await Promise.all(
            newSubCategory.fields.map(async (element) => {
              const result = await whatWeWant(
                element,
                newLvlNameOfArrayOrObject,
                dataFetched
              );
              return result || element;
            })
          )) as unknown as objectType[];
          return newSubCategory;
        } else if (subCategory.type === "none") {
          // fetch json Value on specific branch with the path of the file
          const data = await fetchJsonDataFromGit(
            `${originConfig.repo}/contents${subCategory.file}?ref=${originConfig.branch}`,
            githubToken
          );

          setOriginJsonValue((currentOriginJsonValue) => ({
            ...currentOriginJsonValue,
            [subCategory.title]: data.data,
          }));

          setjsonValue((currentJsonValue) => ({
            ...currentJsonValue,
            [subCategory.title]: data.data,
          }));

          setjsonValueSha((currentJsonValueSha) => ({
            ...currentJsonValueSha,
            [subCategory.title]: data.sha,
          }));

          const newSubCategory = { ...subCategory };
          if (data.succes) {
            newSubCategory.fields = (await Promise.all(
              newSubCategory.fields.map(async (element) => {
                const result = await whatWeWant(
                  element,
                  [...lvlNameOfArrayOrObject, subCategory.title],
                  data.data
                );
                return result || element;
              })
            )) as unknown as any[];
          } else {
            console.log("probleme dans la récupération de donnée");
            return newSubCategory;
          }
          return newSubCategory;
        }
      } catch (error) {
        return subCategory;
      }
    },
    [githubToken, originConfig.branch, originConfig.repo]
  );

  // allow to add property "value" with the path of the real data depending on the JsonValue State
  useEffect(() => {
    (async () => {
      const newOriginConfig = await Promise.all(
        originConfig.fields.map(async (category) => {
          const result = await whatWeWant(category);
          return result || category;
        })
      );
      setOriginConfig({ ...originConfig, fields: newOriginConfig });
      setcurrentConfig({ ...originConfig, fields: newOriginConfig });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when select a element
  function selectAnElement(index: number, newlineInArray?: number) {
    const lineInArray =
      newlineInArray === undefined
        ? position.lineInArray
        : [...position.lineInArray, newlineInArray];
    setPosition({
      positionInConfigFile: [...position.positionInConfigFile, index],
      lineInArray,
    });
  }

  // for come Back to the previous screen
  function onPressBack() {
    const newPosition = { ...position };
    if (currentConfigWithGoodPosition.type === "array") {
      newPosition.lineInArray.pop();
    }
    newPosition.positionInConfigFile.pop();
    setPosition({ ...newPosition });
  }

  function onUpdateInput(path: string, value: string, htmlId?: string) {
    setjsonValue(resolvePathToRealObjectWithArray(path, jsonValue, value));
    if (htmlId && document.getElementById(htmlId)) {
      document.getElementById(htmlId)!.innerHTML = value;
    }
  }
  function onReset() {
    setjsonValue(originJsonValue);
    window.location.reload(false);
  }
  async function onSave() {
    if (contentHasChange) {
      const jsonToSend = (
        Object.keys(jsonValue) as Array<keyof typeof jsonValue>
      )
        .map((keyInJsonValue) => {
          if (
            JSON.stringify(jsonValue[keyInJsonValue]) !==
            JSON.stringify(originJsonValue[keyInJsonValue])
          ) {
            const noneValue: noneType | undefined = originConfig.fields.find(
              (element) =>
                element.type === "none" && element.title === keyInJsonValue
            ) as noneType;

            return {
              data: jsonValue[keyInJsonValue],
              file:
                noneValue.file ||
                `/src/data/${(keyInJsonValue as string).toLowerCase()}.json`,
              sha: jsonValueSha[keyInJsonValue],
            };
          }
          return undefined;
        })
        .filter((el) => el !== undefined);
      const response = await updateJsonDataOnGit(
        originConfig.repo,
        originConfig.branch,
        jsonToSend,
        githubToken
      );
      console.log(response);
    }
  }

  const handleReoder = () => {};
  const handleDelete = (newArr: any[], positionInJsonValue: string) => {
    // if in positionInJsonValue finish with [] soo we retrieve it on path
    if (
      positionInJsonValue[positionInJsonValue.length - 1] === "]" &&
      positionInJsonValue[positionInJsonValue.length - 2] === "["
    ) {
      setjsonValue(
        resolvePathToRealObjectWithArray(
          positionInJsonValue.slice(0, positionInJsonValue.length - 3),
          jsonValue,
          newArr
        )
      );
    }
  };

  const handleAdd = (
    newArr: any[],
    positionInJsonValue: string,
    index: number
  ) => {
    if (
      positionInJsonValue[positionInJsonValue.length - 1] === "]" &&
      positionInJsonValue[positionInJsonValue.length - 2] === "["
    ) {
      setjsonValue(
        resolvePathToRealObjectWithArray(
          positionInJsonValue.slice(0, positionInJsonValue.length - 3),
          jsonValue,
          newArr
        )
      );
      selectAnElement(index, newArr.length - 1);
    }
  };

  const openNetlifyAuth = useCallback(() => {
    const netlifyIdentity = window.netlifyIdentity;
    netlifyIdentity.setLocale("fr");
    if (netlifyIdentity) {
      netlifyIdentity.open();
    } else {
      onDisconnected();
    }
  }, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://identity.netlify.com/v1/netlify-identity-widget.js";
    script.async = true;
    document.body.appendChild(script);

    const userInfoString = localStorage.getItem("gotrue.user");
    const userInfo = userInfoString ? JSON.parse(userInfoString) : false;

    // if already Connected
    if (!!userInfo) {
      const tokenExpiration = new Date(userInfo.exp * 1000);
      const dateNow = new Date();
      if (tokenExpiration < dateNow) {
        onDisconnected();
        isUrlForLogin && openNetlifyAuth();
      } else {
        setuserLoggin(true);
      }
    } else {
      isUrlForLogin && openNetlifyAuth();
    }
  }, [isUrlForLogin, openNetlifyAuth]);

  const onDisconnected = () => {
    localStorage.removeItem("gotrue.user");
    setuserLoggin(false);
  };

  useEffect(() => {
    if (window.netlifyIdentity) {
      const netlifyIdentity = window.netlifyIdentity;
      netlifyIdentity.on("login", () => setuserLoggin(true));
      netlifyIdentity.on("logout", () => onDisconnected);
    }
  }, []);

  if (!userIsLoggin) {
    return null;
  }

  return (
    <AdminPanel
      data={jsonValue}
      currentConfig={currentConfigWithGoodPosition}
      pressOnElement={selectAnElement}
      specificIndexInField={position.lineInArray}
      onPressBack={onPressBack}
      onUpdateInput={onUpdateInput}
      onReset={onReset}
      onSave={onSave}
      onLogout={onDisconnected}
      contentHasChange={contentHasChange}
      onReoder={handleReoder}
      onDelete={handleDelete}
      onAdd={handleAdd}
      title={parameter.title}
    />
  );
}

export default AdminPanelContainer;
