# Wiren Board Rules & Integrations

Коллекция скриптов (`wb-rules`) для контроллеров **WirenBoard**, позволяющая интегрировать внешние устройства и сервисы через MQTT и JavaScript.

---

## 🛰 MikroTik RouterOS Monitoring

Эта интеграция позволяет передавать системные данные с роутера MikroTik (CPU, RAM, Uptime, WAN статус) в интерфейс Wiren Board.

### 📋 Возможности
* **Мониторинг ресурсов:** Загрузка CPU, использование памяти в % и МБ.
* **Системные данные:** Identity устройства, модель, серийный номер и версия RouterOS.
* **Сетевой статус:** Информация об основном WAN-канале.
* **Контроль доступности:** Визуальный статус Online/Offline и отслеживание времени последнего обновления.

---

### 🚀 Настройка

#### 1. Подготовка MikroTik
1.**Для работы скрипта на стороне MikroTik должен быть установлен пакет **iot**.**
/system/package/update/check-for-updates
/system/package/enable iot
/system reboot

3. **Настройте MQTT Broker:**
   В терминале MikroTik выполните (заменив IP на адрес вашего WB):
   ```bash
   /iot mqtt brokers add address=192.168.1.10 name=wirenboard username=root
4. **Добавление скрипта**

/system script 
add dont-require-permissions=no name=mqttpublish owner=admin policy=ftp,reboot,read,write,policy,test,password,sniff,sensitive,romon source="# Required packages: iot\r\
    \n\r\
    \n################################ Configuration ################################\r\
    \n# Name of an existing MQTT broker that should be used for publishing\r\
    \n:local broker \"wirenboard\"\r\
    \n\r\
    \n# MQTT topic where the message should be published\r\
    \n:local topic \"mikrotik/routeros/info\"\r\
    \n\r\
    \n#################################### System ###################################\r\
    \n:put (\"[*] Gathering system info...\")\r\
    \n:local identity [/system/identity/get name]\r\
    \n:local cpuLoad [/system resource get cpu-load]\r\
    \n:local freeMemory [/system resource get free-memory]\r\
    \n:local usedMemory ([/system resource get total-memory] - \$freeMemory)\r\
    \n:local rosVersion [/system package get value-name=version [/system package find where name ~ \"^routeros\"]]\r\
    \n:local model [/system routerboard get value-name=model]\r\
    \n:local serialNumber [/system routerboard get value-name=serial-number]\r\
    \n:local upTime [/system resource get uptime]\r\
    \n:local mainWAN [/ip route get  value-name=comment number=[find where active=yes and dst-address=0.0.0.0/0 and routing-table=main]]\r\
    \n#################################### MQTT #####################################\r\
    \n:local message \"{\\\"identity\\\":\\\"\$identity\\\",\\\"model\\\":\\\"\$model\\\",\\\"sn\\\":\\\"\$serialNumber\\\",\\\"ros\\\":\\\"\$rosVersion\\\",\\\"cpu\\\":\$cpuLoad,\\\"umem\\\":\$usedMemory,\\\"fmem\\\":\$freeMemory,\\\"uptime\\\":\\\"\$upTime\\\"\
    ,\\\"mainWAN\\\":\\\"\$mainWAN\\\"}\"\r\
    \n:log info \"\$message\";\r\
    \n:put (\"[*] Total message size: \$[:len \$message] bytes\")\r\
    \n:put (\"[*] Sending message to MQTT broker...\")\r\
    \n/iot mqtt publish broker=\$broker topic=\$topic message=\$message\r\
    \n:put (\"[*] Done\")"
