package main

import (
	"bytes"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path"
	"time"
)

const (
	defaultServerPort = "8000"
	proxyBaseURL      = "https://greenmobility.frontend.fleetbird.eu/api/prod/v1.06"
)

var (
	serverPort            = os.Getenv("PORT")
	googleMapsAPIKey      = os.Getenv("GOOGLE_MAPS_API_KEY")
	staticAssetsTimestamp = time.Now().Format("20060102150405")
)

func main() {
	http.HandleFunc("/api/cars", handlerProxy("/map/cars"))
	http.HandleFunc("/api/car_types", handlerProxy("/cars/types"))
	http.HandleFunc("/", handlerStatic)

	if serverPort == "" {
		serverPort = defaultServerPort
	}
	fmt.Printf("Listening on port %s...\n", serverPort)
	http.ListenAndServe(":"+serverPort, nil)
}

func handlerProxy(path string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uri, _ := url.Parse(proxyBaseURL + path)
		uri.RawQuery = r.URL.RawQuery
		fmt.Println(uri)
		res, err := http.Get(uri.String())
		if err != nil {
			http.Error(w, err.Error(), res.StatusCode)
			return
		}
		defer res.Body.Close()
		w.Header().Add("Access-Control-Allow-Origin", "*")
		w.Header().Add("Content-Type", "application/json")
		io.Copy(w, res.Body)
	}
}

func handlerStatic(w http.ResponseWriter, r *http.Request) {
	c := httptest.NewRecorder()
	http.FileServer(http.Dir("static")).ServeHTTP(c, r)

	body, _ := ioutil.ReadAll(c.Body)
	for k, v := range map[string]string{
		"GOOGLE_MAPS_API_KEY":     googleMapsAPIKey,
		"STATIC_ASSETS_TIMESTAMP": staticAssetsTimestamp,
	} {
		body = bytes.ReplaceAll(body, []byte(fmt.Sprintf("${%s}", k)), []byte(v))
	}

	switch path.Ext(r.URL.Path) {
	case ".css":
		w.Header().Add("Content-Type", "text/css")
	case ".js":
		w.Header().Add("Content-Type", "text/javascript; charset=utf-8")
	}
	io.Copy(w, bytes.NewReader(body))
}
